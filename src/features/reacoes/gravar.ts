import "server-only";

import type { ResultadoDefinir } from "@/features/listas/gravar";
import type { Reacao } from "@/features/reacoes/opcoes";
import { lerMidia, type Midia } from "@/lib/midia";
import type { ClienteSupabase } from "@/lib/supabase/token";
import { buscarTitulo, type BuscarTitulo, type DadosTitulo } from "@/lib/tmdb/titulo";

/**
 * Deixa a reação pedida ao filme (o ID sozinho) ou à série (`null` apaga). Idempotente; título e
 * gêneros vêm do TMDB. Lê, grava e apaga só a linha do tipo pedido: o título de outro tipo com o
 * mesmo ID fica intacto.
 */
export async function definirReacao(
  supabase: ClienteSupabase,
  usuarioId: string,
  alvo: number | Midia,
  reacao: Reacao | null,
  buscar?: BuscarTitulo,
): Promise<ResultadoDefinir<Reacao>> {
  const { tipo, tmdbId } = lerMidia(alvo);
  const { data: atual, error: erroLeitura } = await supabase
    .from("reacoes")
    .select("reacao, titulo")
    .eq("tipo", tipo)
    .eq("tmdb_id", tmdbId)
    .maybeSingle();
  if (erroLeitura) {
    console.error("[reacoes] falha ao ler:", erroLeitura.code, erroLeitura.message);
    return { ok: false, erro: "banco" };
  }
  const anterior = atual?.reacao ?? null;

  if (reacao === null) {
    if (atual) {
      const { error } = await supabase
        .from("reacoes")
        .delete()
        .eq("tipo", tipo)
        .eq("tmdb_id", tmdbId);
      if (error) {
        console.error("[reacoes] falha ao remover:", error.code, error.message);
        return { ok: false, erro: "banco" };
      }
    }
    return { ok: true, titulo: atual?.titulo ?? null, anterior, atual: null };
  }

  if (atual && anterior === reacao) return { ok: true, titulo: atual.titulo, anterior, atual: reacao };

  let dados: DadosTitulo | null;
  try {
    dados = await (buscar ?? buscarTitulo(tipo))(tmdbId);
  } catch {
    return { ok: false, erro: "tmdb" };
  }
  if (!dados) return { ok: false, erro: "filme-nao-encontrado" };

  const { error } = await supabase.from("reacoes").upsert({
    usuario_id: usuarioId,
    tipo,
    tmdb_id: tmdbId,
    reacao,
    titulo: dados.titulo,
    generos: dados.generos.map((genero) => genero.id),
  });
  if (error) {
    console.error("[reacoes] falha ao salvar:", error.code, error.message);
    return { ok: false, erro: "banco" };
  }
  return { ok: true, titulo: dados.titulo, anterior, atual: reacao };
}
