import "server-only";

import { cache } from "react";

import type { StatusLista } from "@/features/listas/opcoes";
import type { Reacao } from "@/features/reacoes/opcoes";
import { lerMidia, type Midia, type TipoMidia } from "@/lib/midia";
import { createClient } from "@/lib/supabase/server";
import type { ClienteSupabase } from "@/lib/supabase/token";

export type ItemLista = {
  tipo: TipoMidia;
  tmdbId: number;
  status: StatusLista;
  titulo: string;
  posterPath: string | null;
  ano: number | null;
  /** Reação dada ao título (do mesmo tipo), se houver (spec `reacoes`). */
  reacao: Reacao | null;
};

/**
 * Títulos dos tipos pedidos (padrão: só filmes, como o MCP espera) nas duas listas do usuário
 * logado, do mais recente para o mais antigo. `/listas` pede filmes e séries.
 */
export const obterItensLista = cache(
  async (
    cliente?: ClienteSupabase,
    tipos: readonly TipoMidia[] = ["filme"],
  ): Promise<ItemLista[]> => {
    const supabase = cliente ?? (await createClient());
    const [itens, reacoes] = await Promise.all([
      supabase
        .from("lista_itens")
        .select("tipo, tmdb_id, status, titulo, poster_path, ano")
        .in("tipo", tipos)
        .order("adicionado_em", { ascending: false }),
      supabase.from("reacoes").select("tipo, tmdb_id, reacao").in("tipo", tipos),
    ]);

    if (itens.error) {
      console.error("[listas] falha ao ler:", itens.error.code, itens.error.message);
      throw new Error("Não foi possível carregar suas listas.");
    }
    const chave = (linha: { tipo: TipoMidia; tmdb_id: number }) => `${linha.tipo}:${linha.tmdb_id}`;
    const reacaoPorTitulo = new Map((reacoes.data ?? []).map((r) => [chave(r), r.reacao]));

    return itens.data.map((linha) => ({
      tipo: linha.tipo,
      tmdbId: linha.tmdb_id,
      status: linha.status,
      titulo: linha.titulo,
      posterPath: linha.poster_path,
      ano: linha.ano,
      reacao: reacaoPorTitulo.get(chave(linha)) ?? null,
    }));
  },
);

/** IDs dos títulos nas duas listas (sem `tipo`, filmes), para não recomendá-los. */
export async function idsNasListas(
  cliente?: ClienteSupabase,
  tipo: TipoMidia = "filme",
): Promise<number[]> {
  const supabase = cliente ?? (await createClient());
  const { data, error } = await supabase.from("lista_itens").select("tmdb_id").eq("tipo", tipo);
  if (error) {
    console.error("[listas] falha ao ler IDs:", error.code, error.message);
    return [];
  }
  return data.map((linha) => linha.tmdb_id);
}

/** Lista em que o filme (o ID sozinho) ou a série está, ou `null`. */
export async function obterStatusLista(
  alvo: number | Midia,
  cliente?: ClienteSupabase,
): Promise<StatusLista | null> {
  const { tipo, tmdbId } = lerMidia(alvo);
  const supabase = cliente ?? (await createClient());
  const { data } = await supabase
    .from("lista_itens")
    .select("status")
    .eq("tipo", tipo)
    .eq("tmdb_id", tmdbId)
    .maybeSingle();
  return data?.status ?? null;
}
