"use server";

import { revalidatePath } from "next/cache";

import { obterStatusLista } from "@/features/listas/consultas";
import { definirLista } from "@/features/listas/gravar";
import { listaSchema } from "@/features/listas/schema";
import { caminhoMidia, NAO_ENCONTRADO } from "@/lib/midia";
import { createClient } from "@/lib/supabase/server";

export type EstadoLista = { mensagem?: string };

const ERRO_GENERICO = "Não foi possível atualizar sua lista agora. Tente de novo.";

/**
 * Põe o filme ou a série (campo `tipo`; sem ele, filme) na lista pedida; se já estava nela, tira
 * (clicar de novo desfaz). Os dados do título vêm do TMDB no servidor, não do navegador.
 */
export async function alternarLista(
  _anterior: EstadoLista,
  formData: FormData,
): Promise<EstadoLista> {
  const resultado = listaSchema.safeParse({
    tipo: formData.get("tipo") ?? undefined,
    tmdbId: Number(formData.get("tmdbId")),
    status: formData.get("status"),
  });
  if (!resultado.success) return { mensagem: ERRO_GENERICO };
  const { status, ...midia } = resultado.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { mensagem: "Sua sessão expirou. Entre de novo." };

  const atual = await obterStatusLista(midia, supabase);
  const gravado = await definirLista(supabase, user.id, midia, atual === status ? null : status);
  if (!gravado.ok) {
    return {
      mensagem: gravado.erro === "filme-nao-encontrado" ? NAO_ENCONTRADO[midia.tipo] : ERRO_GENERICO,
    };
  }

  revalidatePath(caminhoMidia(midia));
  revalidatePath("/listas");
  revalidatePath("/dashboard");
  return {};
}
