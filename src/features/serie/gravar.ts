import "server-only";

import { diaEmSaoPaulo } from "@/features/recomendacao/semente";
import { episodiosParaAvisar, type SerieComEpisodios } from "@/features/serie/avisos";
import type { ClienteSupabase } from "@/lib/supabase/token";
import { obterSerie } from "@/lib/tmdb/series";

export type ResultadoAcompanhamento =
  { ok: true } | { ok: false; erro: "serie-nao-encontrada" | "tmdb" | "banco" };

export async function definirAcompanhamento(
  supabase: ClienteSupabase,
  usuarioId: string,
  serieTmdbId: number,
  acompanhar: boolean,
): Promise<ResultadoAcompanhamento> {
  if (!acompanhar) {
    // Primeiro os avisos: se o acompanhamento não sair, eles voltam na próxima visita ao início.
    const avisos = await supabase
      .from("avisos_episodios")
      .delete()
      .eq("usuario_id", usuarioId)
      .eq("serie_tmdb_id", serieTmdbId);

    if (avisos.error) {
      console.error("[serie] falha ao remover avisos:", avisos.error.code);
      return { ok: false, erro: "banco" };
    }

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

/** Séries lidas no TMDB a cada visita ao início: as acompanhadas mais recentemente. */
export const LIMITE_SERIES_AVISOS = 20;

const CHAVE_AVISO = "usuario_id,serie_tmdb_id,temporada_numero,episodio_numero";

/**
 * Grava os avisos de episódio das séries que a pessoa acompanha (SPEC/2026-11-25-avisos-episodios.md),
 * com `upsert` pela chave única: a data nova substitui a antiga e `lido_em` fica como estava. A série
 * com o TMDB fora do ar fica de fora; erro do banco vai para o log. Nunca lança.
 */
export async function gerarAvisos(
  supabase: ClienteSupabase,
  usuarioId: string,
  buscarSerie: (id: number) => Promise<SerieComEpisodios | null> = obterSerie,
): Promise<void> {
  const { data: acompanhamentos, error } = await supabase
    .from("acompanhamentos_series")
    .select("serie_tmdb_id, criado_em")
    .eq("usuario_id", usuarioId)
    .order("criado_em", { ascending: false })
    .limit(LIMITE_SERIES_AVISOS);

  if (error) {
    console.error("[serie] falha ao ler acompanhamentos:", error.code);
    return;
  }

  const porSerie = await Promise.all(
    acompanhamentos.map(async ({ serie_tmdb_id, criado_em }) => {
      try {
        const serie = await buscarSerie(serie_tmdb_id);
        return serie ? episodiosParaAvisar(serie, diaEmSaoPaulo(new Date(criado_em))) : [];
      } catch {
        return [];
      }
    }),
  );
  const linhas = porSerie.flat().map((linha) => ({ ...linha, usuario_id: usuarioId }));
  if (linhas.length === 0) return;

  const gravado = await supabase
    .from("avisos_episodios")
    .upsert(linhas, { onConflict: CHAVE_AVISO });
  if (gravado.error) console.error("[serie] falha ao gravar avisos:", gravado.error.code);
}

/** "Marcar como lido": só o aviso não lido da própria pessoa. */
export async function marcarLido(
  supabase: ClienteSupabase,
  usuarioId: string,
  avisoId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("avisos_episodios")
    .update({ lido_em: new Date().toISOString() })
    .eq("usuario_id", usuarioId)
    .eq("id", avisoId)
    .is("lido_em", null);

  if (error) console.error("[serie] falha ao marcar aviso como lido:", error.code);
  return !error;
}
