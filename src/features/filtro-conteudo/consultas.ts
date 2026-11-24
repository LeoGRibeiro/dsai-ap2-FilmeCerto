import "server-only";

import { cache } from "react";

import { ehLimite, type FiltroConteudo } from "@/features/filtro-conteudo/opcoes";
import { createClient } from "@/lib/supabase/server";
import type { ClienteSupabase } from "@/lib/supabase/token";

/** Filtro por idade do usuário logado, ou `null` em "Sem filtro" (sem linha). */
export const obterFiltro = cache(async (cliente?: ClienteSupabase): Promise<FiltroConteudo> => {
  const supabase = cliente ?? (await createClient());
  const { data, error } = await supabase.from("filtros_conteudo").select("limite").maybeSingle();

  if (error || (data && !ehLimite(data.limite))) {
    console.error("[filtro-conteudo] falha ao ler:", error?.code, error?.message);
    throw new Error("Não foi possível carregar o filtro por idade.");
  }
  return data ? (data.limite as FiltroConteudo) : null;
});
