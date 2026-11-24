import "server-only";

import type { ClienteSupabase } from "@/lib/supabase/token";
import { obterSerie } from "@/lib/tmdb/series";

export type ResultadoAcompanhamento =
  | { ok: true }
  | { ok: false; erro: "serie-nao-encontrada" | "tmdb" | "banco" };

export async function definirAcompanhamento(
  supabase: ClienteSupabase,
  usuarioId: string,
  serieTmdbId: number,
  acompanhar: boolean,
): Promise<ResultadoAcompanhamento> {
  if (!acompanhar) {
    const { error } = await supabase
      .from("acompanhamentos_series")
      .delete()
      .eq("usuario_id", usuarioId)
      .eq("serie_tmdb_id", serieTmdbId);

    if (error) {
      console.error("[serie] falha ao remover acompanhamento:", error.code);
      return { ok: false, erro: "banco" };
    }

    return { ok: true };
  }

  let serie: Awaited<ReturnType<typeof obterSerie>>;

  try {
    serie = await obterSerie(serieTmdbId);
  } catch {
    return { ok: false, erro: "tmdb" };
  }

  if (!serie) return { ok: false, erro: "serie-nao-encontrada" };

  const { error } = await supabase.from("acompanhamentos_series").upsert(
    {
      usuario_id: usuarioId,
      serie_tmdb_id: serieTmdbId,
      titulo: serie.titulo,
      poster_path: serie.posterPath,
    },
    { onConflict: "usuario_id,serie_tmdb_id", ignoreDuplicates: true },
  );

  if (error) {
    console.error("[serie] falha ao salvar acompanhamento:", error.code);
    return { ok: false, erro: "banco" };
  }

  return { ok: true };
}

