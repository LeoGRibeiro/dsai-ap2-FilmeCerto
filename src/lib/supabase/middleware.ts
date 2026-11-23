import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/** O que o proxy precisa saber de quem está logado. */
export type UsuarioDaSessao = { id: string; email: string };

/**
 * Renova a sessão do Supabase a cada requisição e devolve a resposta com os
 * cookies atualizados, junto com o usuário autenticado (ou `null`).
 * Pensado para ser chamado a partir de `src/proxy.ts`.
 *
 * Usa `getClaims()`: com a chave assimétrica do projeto, o JWT é validado aqui mesmo,
 * sem a ida ao servidor de Auth que o `getUser()` faz (SPEC/2026-11-23-navegacao-rapida.md).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = getPublicEnv();

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Não coloque código entre a criação do cliente e getClaims(): isso pode
  // causar logouts aleatórios difíceis de depurar.
  const { data } = await supabase.auth.getClaims();
  const user: UsuarioDaSessao | null = data?.claims.sub
    ? { id: data.claims.sub, email: data.claims.email ?? "" }
    : null;

  return { response, user };
}
