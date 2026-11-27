"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { caminhoComNext, sanitizarNext } from "@/features/auth/redirecionamento";
import { gravarOnboarding } from "@/features/preferencias/gravar";
import { onboardingSchema } from "@/features/preferencias/schema";
import { createClient } from "@/lib/supabase/server";
import { obterFilme } from "@/lib/tmdb/filmes";

export type EstadoPreferencias = { mensagem?: string };

const ERRO_GENERICO = "Não foi possível salvar agora. Tente de novo.";

const numeros = (formData: FormData, campo: string) => formData.getAll(campo).map(Number);

export async function salvarPreferencias(
  _anterior: EstadoPreferencias,
  formData: FormData,
): Promise<EstadoPreferencias> {
  const resultado = onboardingSchema.safeParse({
    generos: numeros(formData, "generos"),
    generosEvitados: numeros(formData, "generosEvitados"),
    duracao: formData.get("duracao"),
    frequencia: formData.get("frequencia"),
    streamings: numeros(formData, "streamings"),
    amados: numeros(formData, "amados"),
    rejeitados: numeros(formData, "rejeitados"),
  });
  if (!resultado.success) {
    return { mensagem: resultado.error.issues[0]?.message ?? ERRO_GENERICO };
  }

  // Destino do convite (ex.: a sala da "Noite a dois"); sem ele, o dashboard.
  const destino = sanitizarNext(formData.get("next")?.toString());

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(caminhoComNext("/login", caminhoComNext("/onboarding", destino)));

  // Título e gêneros dos filmes vêm do TMDB no servidor, não do navegador.
  if ((await gravarOnboarding(supabase, user.id, resultado.data, obterFilme)) === "erro") {
    return { mensagem: ERRO_GENERICO };
  }

  // O layout de (app) pode estar no cache do cliente, pré-carregado quando ainda mandava para
  // o onboarding: sem limpar, o destino e /onboarding se redirecionam em loop.
  revalidatePath("/", "layout");
  redirect(destino);
}
