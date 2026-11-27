"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";

import { traduzirErroAuth } from "@/features/auth/erros";
import type { CampoCadastro, CampoLogin, EstadoFormulario } from "@/features/auth/estado";
import { caminhoComNext, sanitizarNext } from "@/features/auth/redirecionamento";
import { cadastroSchema, loginSchema } from "@/features/auth/schema";
import { createClient } from "@/lib/supabase/server";

function texto(formData: FormData, campo: string): string {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor : "";
}

/**
 * A sessão mudou: limpa o cache do roteador antes de redirecionar, para nenhum layout
 * pré-carregado com a sessão anterior ser reaproveitado (SPEC/2026-11-23-navegacao-rapida.md).
 */
function redirecionarComSessaoNova(destino: string): never {
  revalidatePath("/", "layout");
  redirect(destino);
}

function primeiroErroPorCampo<Campo extends string>(erro: z.ZodError) {
  const erros: Partial<Record<Campo, string>> = {};
  for (const issue of erro.issues) {
    const campo = issue.path[0] as Campo;
    erros[campo] ??= issue.message;
  }
  return erros;
}

export async function entrar(
  _anterior: EstadoFormulario<CampoLogin>,
  formData: FormData,
): Promise<EstadoFormulario<CampoLogin>> {
  const valores = { email: texto(formData, "email") };
  const resultado = loginSchema.safeParse({ ...valores, senha: texto(formData, "senha") });
  if (!resultado.success) {
    return { erros: primeiroErroPorCampo(resultado.error), valores };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: resultado.data.email,
    password: resultado.data.senha,
  });
  if (error) {
    if (error.code !== "invalid_credentials") {
      console.error("[auth] falha no login:", error.code, error.message);
    }
    return { mensagem: traduzirErroAuth(error.code), valores };
  }

  redirecionarComSessaoNova(sanitizarNext(texto(formData, "next")));
}

export async function cadastrar(
  _anterior: EstadoFormulario<CampoCadastro>,
  formData: FormData,
): Promise<EstadoFormulario<CampoCadastro>> {
  const valores = { nome: texto(formData, "nome"), email: texto(formData, "email") };
  const resultado = cadastroSchema.safeParse({
    ...valores,
    senha: texto(formData, "senha"),
    confirmacao: texto(formData, "confirmacao"),
  });
  if (!resultado.success) {
    return { erros: primeiroErroPorCampo(resultado.error), valores };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: resultado.data.email,
    password: resultado.data.senha,
    options: { data: { nome: resultado.data.nome } },
  });
  if (error) {
    console.error("[auth] falha no cadastro:", error.code, error.message);
    return { mensagem: traduzirErroAuth(error.code), valores };
  }

  // O destino do convite (ex.: a sala da "Noite a dois") segue para depois do onboarding.
  redirecionarComSessaoNova(caminhoComNext("/onboarding", sanitizarNext(texto(formData, "next"))));
}

export async function sair(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirecionarComSessaoNova("/");
}
