import "server-only";

import { cache } from "react";

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
