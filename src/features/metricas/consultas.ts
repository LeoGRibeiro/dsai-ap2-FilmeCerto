import "server-only";

import type { ClienteSupabase } from "@/lib/supabase/token";

export type TotalEvento = { nome: string; total: number; pessoas: number; semEquipe: number };
export type TotalClima = { pergunta: string; resposta: string; total: number };
export type Metricas = { eventos: TotalEvento[]; climas: TotalClima[] };

/** Código do Postgres para "sem permissão": quem não está em `equipe_metricas`. */
const SEM_PERMISSAO = "42501";

/**
 * Totais de uso para a página `/metricas`, ou `null` se a pessoa não é da equipe.
 * As funções do banco fazem a checagem; outros erros sobem para a página de erro.
 */
export async function obterMetricas(supabase: ClienteSupabase): Promise<Metricas | null> {
  const [eventos, climas] = await Promise.all([
    supabase.rpc("metricas_eventos"),
    supabase.rpc("metricas_climas"),
  ]);
  const erro = eventos.error ?? climas.error;
  if (erro) {
    if (erro.code === SEM_PERMISSAO) return null;
    throw new Error(`[metricas] falha ao ler os totais: ${erro.code} ${erro.message}`);
  }
  return {
    eventos: (eventos.data ?? []).map(({ sem_equipe, ...linha }) => ({
      ...linha,
      semEquipe: sem_equipe,
    })),
    climas: climas.data ?? [],
  };
}
