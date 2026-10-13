import "server-only";

import type { StatusLista } from "@/features/listas/opcoes";
import type { ClienteSupabase } from "@/lib/supabase/token";
import { obterFilme } from "@/lib/tmdb/filmes";
import type { FilmeDetalhes } from "@/lib/tmdb/tipos";

export type ResultadoDefinir<T> =
  | { ok: true; titulo: string | null; anterior: T | null; atual: T | null }
  | { ok: false; erro: "filme-nao-encontrado" | "tmdb" | "banco" };

type BuscarFilme = (id: number) => Promise<FilmeDetalhes | null>;

/**
 * Deixa o filme na lista pedida (`null` tira das listas). É idempotente: repetir não muda nada.
 * Os dados do filme vêm do TMDB no servidor, nunca de quem chama.
 */
export async function definirLista(
  supabase: ClienteSupabase,
  usuarioId: string,
  tmdbId: number,
  status: StatusLista | null,
  buscarFilme: BuscarFilme = obterFilme,
): Promise<ResultadoDefinir<StatusLista>> {
  const { data: atual, error: erroLeitura } = await supabase
    .from("lista_itens")
    .select("status, titulo")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();
  if (erroLeitura) {
    console.error("[listas] falha ao ler:", erroLeitura.code, erroLeitura.message);
    return { ok: false, erro: "banco" };
  }
  const anterior = atual?.status ?? null;

  if (status === null) {
    if (atual) {
      const { error } = await supabase.from("lista_itens").delete().eq("tmdb_id", tmdbId);
      if (error) {
        console.error("[listas] falha ao remover:", error.code, error.message);
        return { ok: false, erro: "banco" };
      }
    }
    return { ok: true, titulo: atual?.titulo ?? null, anterior, atual: null };
  }

  if (atual && anterior === status) return { ok: true, titulo: atual.titulo, anterior, atual: status };

  let filme: FilmeDetalhes | null;
  try {
    filme = await buscarFilme(tmdbId);
  } catch {
    return { ok: false, erro: "tmdb" };
  }
  if (!filme) return { ok: false, erro: "filme-nao-encontrado" };

  const { error } = await supabase.from("lista_itens").upsert({
    usuario_id: usuarioId,
    tmdb_id: tmdbId,
    status,
    titulo: filme.titulo,
    poster_path: filme.posterPath,
    ano: filme.ano,
    generos: filme.generos.map((genero) => genero.id),
    // Ao entrar ou trocar de lista, o filme vai para o topo da aba.
    adicionado_em: new Date().toISOString(),
  });
  if (error) {
    console.error("[listas] falha ao salvar:", error.code, error.message);
    return { ok: false, erro: "banco" };
  }
  return { ok: true, titulo: filme.titulo, anterior, atual: status };
}
