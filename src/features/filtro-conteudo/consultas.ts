import "server-only";

import { cache } from "react";

import { ehLimite, type FiltroConteudo } from "@/features/filtro-conteudo/opcoes";
import { createClient } from "@/lib/supabase/server";
import type { ClienteSupabase } from "@/lib/supabase/token";

/** Filtro de conteúdo do usuário logado, ou `null` com o filtro desligado (sem linha). */
export const obterFiltro = cache(
  async (cliente?: ClienteSupabase): Promise<FiltroConteudo | null> => {
    const supabase = cliente ?? (await createClient());
    const { data, error } = await supabase
      .from("filtros_conteudo")
      .select("classificacao_max, modo")
      .maybeSingle();

    if (error || (data && !ehLimite(data.classificacao_max))) {
      console.error("[filtro-conteudo] falha ao ler:", error?.code, error?.message);
      throw new Error("Não foi possível carregar o filtro de conteúdo.");
    }
    return data && { limite: data.classificacao_max as FiltroConteudo["limite"], modo: data.modo };
  },
);
