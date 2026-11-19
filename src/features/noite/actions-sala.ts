"use server";

import { redirect } from "next/navigation";

import { climaSchema } from "@/features/metricas/eventos";
import { rotaDaSala } from "@/features/noite/estado";
import { idSalaSchema, montarResultado, type Montagem } from "@/features/noite/sala";
import { createClient } from "@/lib/supabase/server";
import { descobrirFilmes, obterFilme } from "@/lib/tmdb/filmes";

/** Ações da "Noite a dois" (SPEC/2026-11-18-noite-a-dois.md). Nada aqui vira preferência. */

export type EstadoSala = { mensagem?: string };

const SESSAO_EXPIRADA = "Sua sessão expirou. Entre de novo.";

async function clienteLogado() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? supabase : null;
}

/** "Vamos escolher juntos": cria a sala e leva a ela. */
export async function criarSala(): Promise<EstadoSala> {
  const supabase = await clienteLogado();
  if (!supabase) return { mensagem: SESSAO_EXPIRADA };

  const { data: sala, error } = await supabase.rpc("criar_sala_noite", {});
  if (error || !sala) {
    console.error("[noite-a-dois] criar sala:", error?.code, error?.message);
    return { mensagem: "Não foi possível criar a sala agora. Tente de novo." };
  }
  redirect(rotaDaSala(sala));
}

/** "Enviar respostas": grava as respostas de quem chama (o banco decide a coluna). */
export async function responderSala(sala: unknown, respostas: unknown): Promise<EstadoSala> {
  const id = idSalaSchema.safeParse(sala);
  const clima = climaSchema.safeParse(respostas);
  if (!id.success || !clima.success) return { mensagem: "Respostas inválidas. Responda de novo." };

  const supabase = await clienteLogado();
  if (!supabase) return { mensagem: SESSAO_EXPIRADA };

  const { humor, experiencia, companhia } = clima.data;
  const { error } = await supabase.rpc("responder_sala_noite", {
    p_sala: id.data,
    p_humor: humor,
    p_experiencia: experiencia,
    p_companhia: companhia,
  });
  if (error) {
    console.error("[noite-a-dois] responder:", error.code, error.message);
    return {
      mensagem:
        error.code === "P0001"
          ? "Essa sala já foi encerrada."
          : "Não foi possível enviar suas respostas agora. Tente de novo.",
    };
  }
  redirect(rotaDaSala(id.data));
}

/** Com as duas respostas, monta e grava a sugestão (chamada pela tela de uma das pessoas). */
export async function montarSala(sala: unknown): Promise<Montagem> {
  const id = idSalaSchema.safeParse(sala);
  if (!id.success) return { ok: false, mensagem: "Sala não encontrada." };

  const supabase = await clienteLogado();
  if (!supabase) return { ok: false, mensagem: SESSAO_EXPIRADA };
  return montarResultado(supabase, id.data, { descobrirFilmes, obterFilme });
}
