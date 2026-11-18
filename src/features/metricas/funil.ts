import type { TotalDetalhe, TotalEvento } from "@/features/metricas/consultas";
import type { NomeEvento } from "@/features/metricas/eventos";

/** Quem entra nas contagens do funil: todas as contas ou só as de fora da equipe. */
export type Recorte = "todos" | "sem-equipe";

/** Lê `?recorte=` da URL; qualquer valor diferente de "sem-equipe" conta todo mundo. */
export function lerRecorte(valor: string | string[] | undefined): Recorte {
  return valor === "sem-equipe" ? "sem-equipe" : "todos";
}

/** Porcentagem inteira de `parte` em `todo`, ou `null` sem base (nunca divide por zero). */
export function porcentagem(parte: number, todo: number): number | null {
  return todo > 0 ? Math.round((parte / todo) * 100) : null;
}

/** Largura da barra em %: uma etapa pode passar da anterior, mas a barra para em 100. */
export function larguraBarra(pct: number | null): number {
  return pct === null ? 0 : Math.min(100, Math.max(0, pct));
}

function contar(linha: { total: number; semEquipe: number } | undefined, recorte: Recorte) {
  if (!linha) return 0;
  return recorte === "sem-equipe" ? linha.semEquipe : linha.total;
}

export type EtapaFunil = {
  nome: NomeEvento;
  total: number;
  /** % da primeira etapa. */
  doInicio: number | null;
  /** % da etapa anterior; `null` na primeira. */
  daAnterior: number | null;
};

/** As etapas de um funil, na ordem pedida, com as porcentagens de cada uma. */
export function calcularFunil(
  eventos: TotalEvento[],
  etapas: readonly NomeEvento[],
  recorte: Recorte,
): EtapaFunil[] {
  const totais = etapas.map((nome) =>
    contar(
      eventos.find((e) => e.nome === nome),
      recorte,
    ),
  );
  return etapas.map((nome, i) => ({
    nome,
    total: totais[i],
    doInicio: porcentagem(totais[i], totais[0]),
    daAnterior: i === 0 ? null : porcentagem(totais[i], totais[i - 1]),
  }));
}

export type Fatia = { valor: string; total: number; parcela: number | null };

/**
 * Quantas vezes cada valor de `dados[chave]` apareceu no evento, na ordem de `valores`,
 * com a parcela de cada um na soma. Valores fora da lista (gravados fora da rota) são ignorados.
 */
export function distribuir(
  detalhes: TotalDetalhe[],
  nome: NomeEvento,
  chave: string,
  valores: readonly string[],
  recorte: Recorte,
): Fatia[] {
  const totais = valores.map((valor) =>
    contar(
      detalhes.find((d) => d.nome === nome && d.chave === chave && d.valor === valor),
      recorte,
    ),
  );
  const soma = totais.reduce((acumulado, total) => acumulado + total, 0);
  return valores.map((valor, i) => ({
    valor,
    total: totais[i],
    parcela: porcentagem(totais[i], soma),
  }));
}
