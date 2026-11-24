import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type UsuarioAtual = {
  id: string;
  email: string;
  nome: string;
};

/**
 * Usuário autenticado na requisição atual, com o nome do perfil, ou `null`.
 * Memoizado por renderização, então header e página compartilham uma só consulta.
 *
 * `getClaims()` valida o JWT localmente (chave assimétrica), sem ida ao servidor de Auth.
 * As server actions continuam com `getUser()` (SPEC/2026-11-23-navegacao-rapida.md).
 */
export const obterUsuarioAtual = cache(async (): Promise<UsuarioAtual | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims.sub;
  if (!id) return null;

  const { data: perfil } = await supabase.from("perfis").select("nome").eq("id", id).maybeSingle();

  return { id, email: data.claims.email ?? "", nome: perfil?.nome ?? "" };
});

/** Como `obterUsuarioAtual`, mas manda para o login quando não há sessão. */
export async function exigirUsuario(): Promise<UsuarioAtual> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/login");
  return usuario;
}
