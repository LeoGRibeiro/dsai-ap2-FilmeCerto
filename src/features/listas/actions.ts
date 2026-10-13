"use server";

import { revalidatePath } from "next/cache";

import { obterStatusLista } from "@/features/listas/consultas";
import { definirLista } from "@/features/listas/gravar";
import { listaSchema } from "@/features/listas/schema";
import { createClient } from "@/lib/supabase/server";

export type EstadoLista = { mensagem?: string };

const ERRO_GENERICO = "Não foi possível atualizar sua lista agora. Tente de novo.";

/**
 * Põe o filme na lista pedida; se ele já estava nela, tira (clicar de novo desfaz).
 * Os dados do filme vêm do TMDB no servidor, não do navegador.
 */
export async function alternarLista(
  _anterior: EstadoLista,
  formData: FormData,
): Promise<EstadoLista> {
  const resultado = listaSchema.safeParse({
    tmdbId: Number(formData.get("tmdbId")),
    status: formData.get("status"),
  });
  if (!resultado.success) return { mensagem: ERRO_GENERICO };
  const { tmdbId, status } = resultado.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { mensagem: "Sua sessão expirou. Entre de novo." };

  const atual = await obterStatusLista(tmdbId, supabase);
  const gravado = await definirLista(supabase, user.id, tmdbId, atual === status ? null : status);
  if (!gravado.ok) {
    return { mensagem: gravado.erro === "filme-nao-encontrado" ? "Filme não encontrado." : ERRO_GENERICO };
  }

  revalidatePath(`/filme/${tmdbId}`);
  revalidatePath("/listas");
  revalidatePath("/dashboard");
  return {};
}
