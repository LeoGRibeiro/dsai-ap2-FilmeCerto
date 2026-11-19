"use server";

import { revalidatePath } from "next/cache";

import { obterReacao } from "@/features/reacoes/consultas";
import { definirReacao } from "@/features/reacoes/gravar";
import { reacaoSchema } from "@/features/reacoes/schema";
import { caminhoMidia, NAO_ENCONTRADO } from "@/lib/midia";
import { createClient } from "@/lib/supabase/server";

export type EstadoReacao = { mensagem?: string };

const ERRO_GENERICO = "Não foi possível salvar sua reação agora. Tente de novo.";

/**
 * Marca a reação ao filme ou à série (campo `tipo`; sem ele, filme); se ela já era a atual,
 * remove (clicar de novo desfaz). Título e gêneros vêm do TMDB no servidor, não do navegador.
 */
export async function alternarReacao(
  _anterior: EstadoReacao,
  formData: FormData,
): Promise<EstadoReacao> {
  const resultado = reacaoSchema.safeParse({
    tipo: formData.get("tipo") ?? undefined,
    tmdbId: Number(formData.get("tmdbId")),
    reacao: formData.get("reacao"),
  });
  if (!resultado.success) return { mensagem: ERRO_GENERICO };
  const { reacao, ...midia } = resultado.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { mensagem: "Sua sessão expirou. Entre de novo." };

  const atual = await obterReacao(midia, supabase);
  const gravado = await definirReacao(supabase, user.id, midia, atual === reacao ? null : reacao);
  if (!gravado.ok) {
    return {
      mensagem: gravado.erro === "filme-nao-encontrado" ? NAO_ENCONTRADO[midia.tipo] : ERRO_GENERICO,
    };
  }

  revalidatePath(caminhoMidia(midia));
  revalidatePath("/dashboard");
  return {};
}
