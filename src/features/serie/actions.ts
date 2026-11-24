"use server";

import { revalidatePath } from "next/cache";

import { definirAcompanhamento } from "@/features/serie/gravar";
import { acompanhamentoSerieSchema } from "@/features/serie/schema";
import { createClient } from "@/lib/supabase/server";

export type EstadoAcompanhamento = { mensagem?: string };

const ERRO_GENERICO = "Não foi possível atualizar seu acompanhamento. Tente novamente.";

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

  if (!user) return { mensagem: "Sua sessão expirou. Entre novamente." };

  const gravado = await definirAcompanhamento(
    supabase,
    user.id,
    resultado.data.tmdbId,
    resultado.data.acompanhar,
  );

  if (!gravado.ok) {
    return {
      mensagem:
        gravado.erro === "serie-nao-encontrada"
          ? "Série não encontrada."
          : ERRO_GENERICO,
    };
  }

  revalidatePath(`/serie/${resultado.data.tmdbId}`);
  revalidatePath("/series");
  return {};
}
