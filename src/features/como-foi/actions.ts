"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { contarExibicao, gravarEscolha, gravarResposta } from "@/features/como-foi/gravar";
import { RESPOSTAS_COMO_FOI } from "@/features/metricas/eventos";
import { tmdbIdSchema } from "@/features/reacoes/schema";
import { createClient } from "@/lib/supabase/server";

export type EstadoComoFoi = { mensagem?: string };

const SESSAO_EXPIRADA = "Sua sessão expirou. Entre de novo.";

const respostaSchema = z.object({
  id: z.number().int().positive(),
  resposta: z.enum(RESPOSTAS_COMO_FOI),
});

async function sessao() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, usuarioId: user.id } : null;
}

/** "Vou ver esse!": guarda a escolha da noite. O título vem do TMDB, não do navegador. */
export async function escolherFilme(tmdbId: unknown): Promise<EstadoComoFoi> {
  const id = tmdbIdSchema.safeParse(tmdbId);
  if (!id.success) return { mensagem: "Filme não encontrado." };

  const atual = await sessao();
  if (!atual) return { mensagem: SESSAO_EXPIRADA };

  const gravado = await gravarEscolha(atual.supabase, id.data);
  if (gravado.ok) return {};
  return {
    mensagem:
      gravado.erro === "filme-nao-encontrado"
        ? "Filme não encontrado."
        : "Não foi possível guardar sua escolha agora. Tente de novo.",
  };
}

/** Chamada uma vez pelo navegador quando o cartão "Como foi?" aparece. */
export async function exibirComoFoi(id: unknown): Promise<void> {
  const valido = z.number().int().positive().safeParse(id);
  if (!valido.success) return;
  const atual = await sessao();
  if (atual) await contarExibicao(atual.supabase, valido.data);
}

/** Resposta do cartão "Como foi?" (um formulário por botão, funciona sem JS). */
export async function responderComoFoi(
  _anterior: EstadoComoFoi,
  formData: FormData,
): Promise<EstadoComoFoi> {
  const erroGenerico = { mensagem: "Não foi possível salvar sua resposta agora. Tente de novo." };
  const valido = respostaSchema.safeParse({
    id: Number(formData.get("id")),
    resposta: formData.get("resposta"),
  });
  if (!valido.success) return erroGenerico;

  const atual = await sessao();
  if (!atual) return { mensagem: SESSAO_EXPIRADA };

  const { id, resposta } = valido.data;
  const gravado = await gravarResposta(atual.supabase, atual.usuarioId, id, resposta);
  if (!gravado.ok) return erroGenerico;

  revalidatePath("/dashboard");
  revalidatePath(`/filme/${gravado.tmdbId}`);
  revalidatePath("/listas");
  return {};
}
