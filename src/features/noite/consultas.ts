import "server-only";

import { obterFiltro } from "@/features/filtro-conteudo/consultas";
import type { Clima } from "@/features/metricas/eventos";
import type { EstadoNoite } from "@/features/noite/estado";
import {
  recomendarNoite,
  type PerfilNoite,
  type ResultadoNoite,
} from "@/features/noite/recomendar";
import { createClient } from "@/lib/supabase/server";
import type { TipoMidia } from "@/lib/midia";
import type { ClienteSupabase } from "@/lib/supabase/token";
import { descobrirFilmes, obterFilme } from "@/lib/tmdb/filmes";
import { descobrirSeries, obterSerie } from "@/lib/tmdb/series";

/**
 * IDs que o wizard nunca recomenda: títulos do tipo pedido em "Já assisti" ou com qualquer
 * reação. "Quero assistir" fica de fora de propósito, e o outro tipo também (o ID de uma série
 * pode ser o de outro filme). Lança se o banco falhar, para a tela não arriscar recomendar um
 * título já visto.
 */
export async function idsParaExcluir(
  supabase: ClienteSupabase,
  tipo: TipoMidia = "filme",
): Promise<number[]> {
  const [assistidos, reacoes] = await Promise.all([
    supabase.from("lista_itens").select("tmdb_id").eq("tipo", tipo).eq("status", "assistido"),
    supabase.from("reacoes").select("tmdb_id").eq("tipo", tipo),
  ]);
  const erro = assistidos.error ?? reacoes.error;
  if (erro) {
    console.error("[noite] falha ao ler as exclusões:", erro.code, erro.message);
    throw new Error("Não foi possível carregar seus filmes.");
  }
  return [...(assistidos.data ?? []), ...(reacoes.data ?? [])].map((linha) => linha.tmdb_id);
}

/** Recomendação da rodada para o usuário logado, do tipo do estado, só lendo o perfil. */
export async function obterNoite(
  respostas: Clima,
  estado: EstadoNoite,
  perfil: PerfilNoite,
): Promise<ResultadoNoite | null> {
  const supabase = await createClient();
  const [excluir, filtro] = await Promise.all([
    idsParaExcluir(supabase, estado.tipo),
    obterFiltro(supabase),
  ]);
  const comum = { respostas, estado, perfil: { ...perfil, filtro }, excluir };
  return estado.tipo === "serie"
    ? recomendarNoite({ ...comum, tipo: "serie", api: { descobrirSeries, obterSerie } })
    : recomendarNoite({ ...comum, api: { descobrirFilmes, obterFilme } });
}
