import "server-only";

import { devePerguntar, visitaNova } from "@/features/como-foi/regras";
import { definirLista } from "@/features/listas/gravar";
import type { RESPOSTAS_COMO_FOI } from "@/features/metricas/eventos";
import { registrarEvento } from "@/features/metricas/registrar";
import { definirReacao } from "@/features/reacoes/gravar";
import type { ClienteSupabase } from "@/lib/supabase/token";
import { obterFilme } from "@/lib/tmdb/filmes";
import type { FilmeDetalhes } from "@/lib/tmdb/tipos";

export type RespostaComoFoi = (typeof RESPOSTAS_COMO_FOI)[number];

type Erro = "filme-nao-encontrado" | "nao-encontrada" | "tmdb" | "banco";
export type ResultadoComoFoi = { ok: true; tmdbId: number } | { ok: false; erro: Erro };

type BuscarFilme = (id: number) => Promise<FilmeDetalhes | null>;

function falhaNoBanco(acao: string, erro: { code: string; message: string }): ResultadoComoFoi {
  console.error(`[como-foi] falha ao ${acao}:`, erro.code, erro.message);
  return { ok: false, erro: "banco" };
}

/** Guarda o "Vou ver esse!": só o filme e o título do TMDB, nunca as respostas do wizard. */
export async function gravarEscolha(
  supabase: ClienteSupabase,
  tmdbId: number,
  buscarFilme: BuscarFilme = obterFilme,
): Promise<ResultadoComoFoi> {
  let filme: FilmeDetalhes | null;
  try {
    filme = await buscarFilme(tmdbId);
  } catch {
    return { ok: false, erro: "tmdb" };
  }
  if (!filme) return { ok: false, erro: "filme-nao-encontrado" };

  const { error } = await supabase
    .from("escolhas_noite")
    .insert({ tipo: "filme", tmdb_id: tmdbId, titulo: filme.titulo });
  return error ? falhaNoBanco("gravar a escolha", error) : { ok: true, tmdbId };
}

/**
 * Conta a exibição do cartão. Só uma visita nova gasta uma pergunta e gera
 * `como_foi_exibido`; recarregar o dashboard na mesma visita não grava nada.
 */
export async function contarExibicao(
  supabase: ClienteSupabase,
  id: number,
  agora = new Date(),
): Promise<boolean> {
  const { data: escolha, error } = await supabase
    .from("escolhas_noite")
    .select("escolhido_em, perguntado_em, vezes_perguntado, respondido_em")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    falhaNoBanco("ler a escolha", error);
    return false;
  }
  if (!escolha || !devePerguntar(escolha, agora) || !visitaNova(escolha, agora)) return false;

  const { error: erroUpdate } = await supabase
    .from("escolhas_noite")
    .update({ vezes_perguntado: escolha.vezes_perguntado + 1, perguntado_em: agora.toISOString() })
    .eq("id", id)
    // Duas abas ao mesmo tempo não contam duas visitas.
    .eq("vezes_perguntado", escolha.vezes_perguntado);
  if (erroUpdate) {
    falhaNoBanco("contar a exibição", erroUpdate);
    return false;
  }
  await registrarEvento(supabase, { nome: "como_foi_exibido" });
  return true;
}

export const GRAVACOES = { definirReacao, definirLista };

/**
 * Responde "Como foi?". Uma reação grava a reação e "Já assisti" antes de marcar a
 * escolha como respondida, para uma falha deixar a pergunta de pé. "Não cheguei a ver"
 * só marca como respondida. Responder de novo não grava nada.
 */
export async function gravarResposta(
  supabase: ClienteSupabase,
  usuarioId: string,
  id: number,
  resposta: RespostaComoFoi,
  gravacoes = GRAVACOES,
): Promise<ResultadoComoFoi> {
  const { data: escolha, error } = await supabase
    .from("escolhas_noite")
    .select("tmdb_id, respondido_em")
    .eq("id", id)
    .maybeSingle();
  if (error) return falhaNoBanco("ler a escolha", error);
  if (!escolha) return { ok: false, erro: "nao-encontrada" };
  const tmdbId = escolha.tmdb_id;
  if (escolha.respondido_em !== null) return { ok: true, tmdbId };

  if (resposta !== "nao-vi") {
    const reacao = await gravacoes.definirReacao(supabase, usuarioId, tmdbId, resposta);
    if (!reacao.ok) return reacao;
    const lista = await gravacoes.definirLista(supabase, usuarioId, tmdbId, "assistido");
    if (!lista.ok) return lista;
  }

  const { error: erroUpdate } = await supabase
    .from("escolhas_noite")
    .update({ respondido_em: new Date().toISOString() })
    .eq("id", id);
  if (erroUpdate) return falhaNoBanco("marcar a resposta", erroUpdate);

  await registrarEvento(supabase, { nome: "como_foi_respondido", dados: { resposta } });
  return { ok: true, tmdbId };
}
