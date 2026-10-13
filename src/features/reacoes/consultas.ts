import "server-only";

import { cache } from "react";

import type { Reacao } from "@/features/reacoes/opcoes";
import type { ReacaoMotor } from "@/features/recomendacao/tipos";
import { createClient } from "@/lib/supabase/server";
import type { ClienteSupabase } from "@/lib/supabase/token";

/** Todas as reações do usuário logado (a RLS limita às dele), no formato do motor. */
export const obterReacoes = cache(async (cliente?: ClienteSupabase): Promise<ReacaoMotor[]> => {
  const supabase = cliente ?? (await createClient());
  const { data, error } = await supabase
    .from("reacoes")
    .select("tmdb_id, reacao, titulo, generos")
    .order("atualizado_em", { ascending: false });

  if (error) {
    console.error("[reacoes] falha ao ler:", error.code, error.message);
    return [];
  }
  return data.map((linha) => ({
    tmdbId: linha.tmdb_id,
    reacao: linha.reacao,
    titulo: linha.titulo,
    generos: linha.generos,
  }));
});

/** Reação do usuário logado a um filme, ou `null`. */
export async function obterReacao(tmdbId: number, cliente?: ClienteSupabase): Promise<Reacao | null> {
  const supabase = cliente ?? (await createClient());
  const { data } = await supabase
    .from("reacoes")
    .select("reacao")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();
  return data?.reacao ?? null;
}
