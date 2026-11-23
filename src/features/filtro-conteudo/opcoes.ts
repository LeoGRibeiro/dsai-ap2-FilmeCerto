import type { ClassificacaoBR } from "@/lib/tmdb/tipos";

/** Filtro por idade (SPEC/2026-11-23-filtro-idade.md). Pode ser usado no navegador. */

/** As opções ligadas. "18" é "Sem conteúdo +18": de L a 16 fica normal. */
export const LIMITES = ["10", "14", "18"] as const satisfies readonly ClassificacaoBR[];
export type LimiteFiltro = (typeof LIMITES)[number];

/** O filtro da conta: o limite escolhido, ou `null` em "Sem filtro" (sem linha no banco). */
export type FiltroConteudo = LimiteFiltro | null;

/** Com qualquer filtro ligado, o que pode ser recomendado: até 16, porque o 18 é bloqueado. */
export const LIMITE_COM_FILTRO: ClassificacaoBR = "16";

/** Valor do formulário para "Sem filtro". */
export const SEM_FILTRO = "sem";

export type OpcaoFiltro = {
  valor: LimiteFiltro | typeof SEM_FILTRO;
  rotulo: string;
  descricao: string;
};

export const OPCOES_FILTRO: readonly OpcaoFiltro[] = [
  {
    valor: SEM_FILTRO,
    rotulo: "Sem filtro",
    descricao: "Todos os títulos aparecem normalmente.",
  },
  {
    valor: "10",
    rotulo: "Até 10 anos",
    descricao: "Títulos de 12 a 16 anos abrem com um aviso. Títulos +18 ficam bloqueados.",
  },
  {
    valor: "14",
    rotulo: "Até 14 anos",
    descricao: "Títulos de 16 anos abrem com um aviso. Títulos +18 ficam bloqueados.",
  },
  {
    valor: "18",
    rotulo: "Sem conteúdo +18",
    descricao: "Títulos +18 ficam bloqueados em todo o app.",
  },
];

export function ehLimite(valor: unknown): valor is LimiteFiltro {
  return LIMITES.includes(valor as LimiteFiltro);
}
