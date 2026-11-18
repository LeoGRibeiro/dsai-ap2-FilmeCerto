import "server-only";

import type { ClienteSupabase } from "@/lib/supabase/token";

export type TotalEvento = { nome: string; total: number; pessoas: number; semEquipe: number };
export type TotalClima = { pergunta: string; resposta: string; total: number };
/** Ocorrências de um evento com um valor numa chave de `dados` (ex.: `wizard_troca`, `motivo`, `ja-vi`). */
export type TotalDetalhe = {
  nome: string;
  chave: string;
  valor: string;
  total: number;
  semEquipe: number;
};
export type Metricas = { eventos: TotalEvento[]; climas: TotalClima[]; detalhes: TotalDetalhe[] };

/** Código do Postgres para "sem permissão": quem não está em `equipe_metricas`. */
const SEM_PERMISSAO = "42501";

/** `sem_equipe` do banco vira `semEquipe`. */
function converter<T extends { sem_equipe: number }>(linhas: T[] | null) {
  return (linhas ?? []).map(({ sem_equipe, ...linha }) => ({ ...linha, semEquipe: sem_equipe }));
}

/**
 * Totais de uso para a página `/metricas`, ou `null` se a pessoa não é da equipe.
 * As funções do banco fazem a checagem; outros erros sobem para a página de erro.
 */
export async function obterMetricas(supabase: ClienteSupabase): Promise<Metricas | null> {
  const [eventos, climas, detalhes] = await Promise.all([
    supabase.rpc("metricas_eventos"),
    supabase.rpc("metricas_climas"),
    supabase.rpc("metricas_detalhes"),
  ]);
  const erro = eventos.error ?? climas.error ?? detalhes.error;
  if (erro) {
    if (erro.code === SEM_PERMISSAO) return null;
    throw new Error(`[metricas] falha ao ler os totais: ${erro.code} ${erro.message}`);
  }
  return {
    eventos: converter(eventos.data),
    climas: climas.data ?? [],
    detalhes: converter(detalhes.data),
  };
}
