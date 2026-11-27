"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { definirAcompanhamento, marcarLido } from "@/features/serie/gravar";
import { acompanhamentoSerieSchema } from "@/features/serie/schema";
import { createClient } from "@/lib/supabase/server";

export type EstadoAcompanhamento = { mensagem?: string };

const ERRO_GENERICO = "Não foi possível atualizar seu acompanhamento. Tente novamente.";
const SESSAO_EXPIRADA = { mensagem: "Sua sessão expirou. Entre novamente." };

export async function alternarAcompanhamento(
  _anterior: EstadoAcompanhamento,
  formData: FormData,
): Promise<EstadoAcompanhamento> {
  const resultado = acompanhamentoSerieSchema.safeParse({
    tmdbId: Number(formData.get("tmdbId")),
    acompanhar: formData.get("acompanhar") === "true",
  });

  if (!resultado.success) return { mensagem: ERRO_GENERICO };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return SESSAO_EXPIRADA;

  const gravado = await definirAcompanhamento(
    supabase,
    user.id,
    resultado.data.tmdbId,
    resultado.data.acompanhar,
  );

  if (!gravado.ok) {
    return {
      mensagem: gravado.erro === "serie-nao-encontrada" ? "Série não encontrada." : ERRO_GENERICO,
    };
  }

  revalidatePath(`/serie/${resultado.data.tmdbId}`);
  revalidatePath("/dashboard");
  return {};
}

/** "Marcar como lido" do cartão de avisos do início (um formulário por aviso). */
export async function marcarAvisoLido(
  _anterior: EstadoAcompanhamento,
  formData: FormData,
): Promise<EstadoAcompanhamento> {
  const id = z.uuid().safeParse(formData.get("id"));
  const erro = { mensagem: "Não foi possível marcar o aviso como lido. Tente novamente." };
  if (!id.success) return erro;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return SESSAO_EXPIRADA;

  if (!(await marcarLido(supabase, user.id, id.data))) return erro;
  revalidatePath("/dashboard");
  return {};
}
