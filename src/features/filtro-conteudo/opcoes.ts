import type { Database } from "@/lib/supabase/database.types";
import type { ClassificacaoBR } from "@/lib/tmdb/tipos";

/** Filtro de conteúdo sensível (SPEC/2026-11-23-filtro-conteudo.md). Pode ser usado no navegador. */

/** Limites que dá para escolher. Sem 18: um limite de 18 é o mesmo que o filtro desligado. */
export const LIMITES = ["L", "10", "12", "14", "16"] as const satisfies readonly ClassificacaoBR[];
export type LimiteFiltro = (typeof LIMITES)[number];

export const MODOS = ["avisar", "ocultar", "bloquear"] as const satisfies readonly ModoFiltro[];
export type ModoFiltro = Database["public"]["Enums"]["modo_filtro_conteudo"];

/** O filtro ligado; `null` quando está desligado (sem linha no banco). */
export type FiltroConteudo = { limite: LimiteFiltro; modo: ModoFiltro };

export const ROTULOS_LIMITE: Record<LimiteFiltro, string> = {
  L: "Livre",
  "10": "Até 10 anos",
  "12": "Até 12 anos",
  "14": "Até 14 anos",
  "16": "Até 16 anos",
};

export const ROTULOS_MODO: Record<ModoFiltro, { rotulo: string; descricao: string }> = {
  avisar: {
    rotulo: "Avisar",
    descricao: "Aparece com as imagens borradas e a classificação. Um toque mostra.",
  },
  ocultar: {
    rotulo: "Ocultar",
    descricao: "Some das recomendações. Na busca e nas suas listas, aparece borrado.",
  },
  bloquear: {
    rotulo: "Bloquear",
    descricao: "Some também da busca, e a página do título fica bloqueada.",
  },
};

export type FaixaIdade = { id: string; rotulo: string; filtro: FiltroConteudo | null };

/**
 * "Quem usa esta conta?": cada faixa só preenche o formulário; a idade nunca é guardada.
 * A classificação diz "não recomendado para menores de X", então quem tem X anos vê X.
 */
export const FAIXAS_IDADE: readonly FaixaIdade[] = [
  { id: "adulto", rotulo: "Adulto", filtro: null },
  { id: "16-17", rotulo: "16 ou 17 anos", filtro: { limite: "16", modo: "ocultar" } },
  { id: "14-15", rotulo: "14 ou 15 anos", filtro: { limite: "14", modo: "ocultar" } },
  { id: "12-13", rotulo: "12 ou 13 anos", filtro: { limite: "12", modo: "bloquear" } },
  { id: "10-11", rotulo: "10 ou 11 anos", filtro: { limite: "10", modo: "bloquear" } },
  { id: "ate-9", rotulo: "Até 9 anos", filtro: { limite: "L", modo: "bloquear" } },
];

export function ehLimite(valor: unknown): valor is LimiteFiltro {
  return LIMITES.includes(valor as LimiteFiltro);
}
