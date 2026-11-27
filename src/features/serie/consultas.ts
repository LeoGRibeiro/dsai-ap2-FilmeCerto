import "server-only";

import { cache } from "react";

import type { AvisoEpisodio } from "@/features/serie/avisos";
import { createClient } from "@/lib/supabase/server";
import type { ClienteSupabase } from "@/lib/supabase/token";

export const obterAcompanhamentoSerie = cache(
  async (serieTmdbId: number, cliente?: ClienteSupabase): Promise<boolean> => {
    const supabase = cliente ?? (await createClient());

    const { data, error } = await supabase
      .from("acompanhamentos_series")
      .select("serie_tmdb_id")
      .eq("serie_tmdb_id", serieTmdbId)
      .maybeSingle();

    if (error) {
      console.error("[serie] falha ao consultar acompanhamento:", error.code);
      throw new Error("Não foi possível consultar o acompanhamento da série.");
    }

    return data !== null;
  },
);

/**
 * Avisos não lidos de episódios que já estrearam (até `hoje`, `AAAA-MM-DD` em São Paulo), os mais
 * recentes primeiro. Erro do banco vira lista vazia: o início abre sem o cartão.
 */
export async function obterAvisosNaoLidos(
  supabase: ClienteSupabase,
  usuarioId: string,
  hoje: string,
  limite = 10,
): Promise<AvisoEpisodio[]> {
  const { data, error } = await supabase
    .from("avisos_episodios")
    .select("id, serie_tmdb_id, serie_titulo, temporada_numero, episodio_numero, data_estreia")
    .eq("usuario_id", usuarioId)
    .is("lido_em", null)
    .lte("data_estreia", hoje)
    .order("data_estreia", { ascending: false })
    .order("criado_em", { ascending: false })
    .limit(limite);

  if (error) {
    console.error("[serie] falha ao ler avisos:", error.code);
    return [];
  }

  return data.map((aviso) => ({
    id: aviso.id,
    serieTmdbId: aviso.serie_tmdb_id,
    serieTitulo: aviso.serie_titulo,
    temporada: aviso.temporada_numero,
    episodio: aviso.episodio_numero,
    dataEstreia: aviso.data_estreia,
  }));
}
