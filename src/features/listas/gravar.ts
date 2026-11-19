import "server-only";

import type { StatusLista } from "@/features/listas/opcoes";
import { lerMidia, type Midia } from "@/lib/midia";
import type { ClienteSupabase } from "@/lib/supabase/token";
import { buscarTitulo, type BuscarTitulo, type DadosTitulo } from "@/lib/tmdb/titulo";

export type ResultadoDefinir<T> =
  | { ok: true; titulo: string | null; anterior: T | null; atual: T | null }
  | { ok: false; erro: "filme-nao-encontrado" | "tmdb" | "banco" };

/**
 * Deixa o filme (o ID sozinho) ou a série na lista pedida (`null` tira das listas). É
 * idempotente: repetir não muda nada. Os dados do título vêm do TMDB no servidor, nunca de quem
 * chama. Lê, grava e apaga só a linha do tipo pedido: o título de outro tipo com o mesmo ID fica
 * intacto.
 */
export async function definirLista(
  supabase: ClienteSupabase,
  usuarioId: string,
  alvo: number | Midia,
  status: StatusLista | null,
  buscar?: BuscarTitulo,
): Promise<ResultadoDefinir<StatusLista>> {
  const { tipo, tmdbId } = lerMidia(alvo);
  const { data: atual, error: erroLeitura } = await supabase
    .from("lista_itens")
    .select("status, titulo")
    .eq("tipo", tipo)
    .eq("tmdb_id", tmdbId)
    .maybeSingle();
  if (erroLeitura) {
    console.error("[listas] falha ao ler:", erroLeitura.code, erroLeitura.message);
    return { ok: false, erro: "banco" };
  }
  const anterior = atual?.status ?? null;

  if (status === null) {
    if (atual) {
      const { error } = await supabase
        .from("lista_itens")
        .delete()
        .eq("tipo", tipo)
        .eq("tmdb_id", tmdbId);
      if (error) {
        console.error("[listas] falha ao remover:", error.code, error.message);
        return { ok: false, erro: "banco" };
      }
    }
    return { ok: true, titulo: atual?.titulo ?? null, anterior, atual: null };
  }

  if (atual && anterior === status) return { ok: true, titulo: atual.titulo, anterior, atual: status };

  let dados: DadosTitulo | null;
  try {
    dados = await (buscar ?? buscarTitulo(tipo))(tmdbId);
  } catch {
    return { ok: false, erro: "tmdb" };
  }
  if (!dados) return { ok: false, erro: "filme-nao-encontrado" };

  const { error } = await supabase.from("lista_itens").upsert({
    usuario_id: usuarioId,
    tipo,
    tmdb_id: tmdbId,
    status,
    titulo: dados.titulo,
    poster_path: dados.posterPath,
    ano: dados.ano,
    generos: dados.generos.map((genero) => genero.id),
    // Ao entrar ou trocar de lista, o título vai para o topo da aba.
    adicionado_em: new Date().toISOString(),
  });
  if (error) {
    console.error("[listas] falha ao salvar:", error.code, error.message);
    return { ok: false, erro: "banco" };
  }
  return { ok: true, titulo: dados.titulo, anterior, atual: status };
}
