import { LIMITE_COM_FILTRO, type FiltroConteudo } from "@/features/filtro-conteudo/opcoes";
import { ateAClassificacao, CLASSIFICACOES_BR } from "@/lib/tmdb/classificacao";
import type { ClassificacaoBR } from "@/lib/tmdb/tipos";

/**
 * - `normal`: o título aparece como sempre.
 * - `aviso`: aparece, e a página dele abre com a faixa "Não recomendado para menores de X".
 * - `bloqueado`: +18 com filtro; não aparece em lugar nenhum e a página não mostra nada dele.
 */
export type Tratamento = "normal" | "aviso" | "bloqueado";

/**
 * Como tratar um título com esta classificação. Sem filtro, sempre `normal`; com filtro, 18 é
 * bloqueado e acima do limite ou sem classificação dá aviso (nunca bloqueio).
 */
export function tratamento(
  classificacao: ClassificacaoBR | null | undefined,
  filtro: FiltroConteudo,
): Tratamento {
  if (!filtro) return "normal";
  if (classificacao === "18") return "bloqueado";
  return ateAClassificacao(classificacao, filtro) ? "normal" : "aviso";
}

export function bloqueado(
  classificacao: ClassificacaoBR | null | undefined,
  filtro: FiltroConteudo,
): boolean {
  return tratamento(classificacao, filtro) === "bloqueado";
}

/**
 * Até onde vai o que o app sugere: o próprio limite com "Até 10" e "Até 14", e 16 com "Sem
 * conteúdo +18" (o 18 é bloqueado). `null` sem filtro.
 */
export function limiteDasRecomendacoes(filtro: FiltroConteudo): ClassificacaoBR | null {
  if (!filtro) return null;
  return filtro === "18" ? LIMITE_COM_FILTRO : filtro;
}

/** Até onde vai a busca por filtros com filtro: tudo menos o 18, que é bloqueado. */
export function limiteDaBusca(filtro: FiltroConteudo): ClassificacaoBR | null {
  return filtro ? LIMITE_COM_FILTRO : null;
}

/**
 * Se o título fica fora das recomendações: com filtro, a classificação passa do limite delas.
 * Sem classificação, não fica fora (abre com aviso, mas pode ser sugerido).
 */
export function foraDasRecomendacoes(
  classificacao: ClassificacaoBR | null | undefined,
  filtro: FiltroConteudo,
): boolean {
  const limite = limiteDasRecomendacoes(filtro);
  return !!limite && !!classificacao && !ateAClassificacao(classificacao, limite);
}

/** O menor dos limites dados (família, filtro); `null` sem nenhum. */
export function limiteMaisRestrito(
  ...limites: (ClassificacaoBR | null | undefined)[]
): ClassificacaoBR | null {
  const dados = limites.filter((limite): limite is ClassificacaoBR => !!limite);
  if (dados.length === 0) return null;
  return CLASSIFICACOES_BR[Math.min(...dados.map((limite) => CLASSIFICACOES_BR.indexOf(limite)))]!;
}
