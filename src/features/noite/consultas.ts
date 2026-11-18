import "server-only";

import type { Clima } from "@/features/metricas/eventos";
import type { EstadoNoite } from "@/features/noite/estado";
import {
  recomendarNoite,
  type PerfilNoite,
  type ResultadoNoite,
} from "@/features/noite/recomendar";
import { createClient } from "@/lib/supabase/server";
import type { ClienteSupabase } from "@/lib/supabase/token";
import { descobrirFilmes, obterFilme } from "@/lib/tmdb/filmes";

/**
 * IDs que o wizard nunca recomenda: "Já assisti" e filmes com qualquer reação.
 * "Quero assistir" fica de fora de propósito. Lança se o banco falhar, para a tela
 * não arriscar recomendar um filme já visto.
 */
export async function idsParaExcluir(supabase: ClienteSupabase): Promise<number[]> {
  const [assistidos, reacoes] = await Promise.all([
    supabase.from("lista_itens").select("tmdb_id").eq("status", "assistido"),
    supabase.from("reacoes").select("tmdb_id"),
  ]);
  const erro = assistidos.error ?? reacoes.error;
  if (erro) {
    console.error("[noite] falha ao ler as exclusões:", erro.code, erro.message);
    throw new Error("Não foi possível carregar seus filmes.");
  }
  return [...(assistidos.data ?? []), ...(reacoes.data ?? [])].map((linha) => linha.tmdb_id);
}

/** Recomendação da rodada para o usuário logado, só lendo o perfil. */
export async function obterNoite(
  respostas: Clima,
  estado: EstadoNoite,
  perfil: PerfilNoite,
): Promise<ResultadoNoite | null> {
  const supabase = await createClient();
  return recomendarNoite({
    respostas,
    estado,
    perfil,
    excluir: await idsParaExcluir(supabase),
    api: { descobrirFilmes, obterFilme },
  });
}
