import "server-only";

import type { ResultadoDefinir } from "@/features/listas/gravar";
import type { Reacao } from "@/features/reacoes/opcoes";
import type { ClienteSupabase } from "@/lib/supabase/token";
import { obterFilme } from "@/lib/tmdb/filmes";
import type { FilmeDetalhes } from "@/lib/tmdb/tipos";

type BuscarFilme = (id: number) => Promise<FilmeDetalhes | null>;

/** Deixa a reação pedida (`null` apaga). Idempotente; título e gêneros vêm do TMDB. */
export async function definirReacao(
  supabase: ClienteSupabase,
  usuarioId: string,
  tmdbId: number,
  reacao: Reacao | null,
  buscarFilme: BuscarFilme = obterFilme,
): Promise<ResultadoDefinir<Reacao>> {
  const { data: atual, error: erroLeitura } = await supabase
    .from("reacoes")
    .select("reacao, titulo")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();
  if (erroLeitura) {
    console.error("[reacoes] falha ao ler:", erroLeitura.code, erroLeitura.message);
    return { ok: false, erro: "banco" };
  }
  const anterior = atual?.reacao ?? null;

  if (reacao === null) {
    if (atual) {
      const { error } = await supabase.from("reacoes").delete().eq("tmdb_id", tmdbId);
      if (error) {
        console.error("[reacoes] falha ao remover:", error.code, error.message);
        return { ok: false, erro: "banco" };
      }
    }
    return { ok: true, titulo: atual?.titulo ?? null, anterior, atual: null };
  }

  if (atual && anterior === reacao) return { ok: true, titulo: atual.titulo, anterior, atual: reacao };

  let filme: FilmeDetalhes | null;
  try {
    filme = await buscarFilme(tmdbId);
  } catch {
    return { ok: false, erro: "tmdb" };
  }
  if (!filme) return { ok: false, erro: "filme-nao-encontrado" };

  const { error } = await supabase.from("reacoes").upsert({
    usuario_id: usuarioId,
    tmdb_id: tmdbId,
    reacao,
    titulo: filme.titulo,
    generos: filme.generos.map((genero) => genero.id),
  });
  if (error) {
    console.error("[reacoes] falha ao salvar:", error.code, error.message);
    return { ok: false, erro: "banco" };
  }
  return { ok: true, titulo: filme.titulo, anterior, atual: reacao };
}
