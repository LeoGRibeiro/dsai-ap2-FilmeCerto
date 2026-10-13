import "server-only";

import type { AuthInfo } from "@modelcontextprotocol/server";

import { clientePorToken } from "@/lib/supabase/token";

export const RECURSO_METADADOS = "/.well-known/oauth-protected-resource/api/mcp";

/**
 * Valida o access token emitido pelo OAuth Server do Supabase.
 * Aceita só tokens de usuário autenticado. O id do usuário vai em `extra.usuarioId`.
 */
export async function verificarToken(
  _req: Request,
  token?: string,
): Promise<AuthInfo | undefined> {
  if (!token) return undefined;
  const { data, error } = await clientePorToken(token).auth.getClaims(token);
  if (error || !data) return undefined;

  const claims = data.claims as Record<string, unknown>;
  if (claims.role !== "authenticated" || typeof claims.sub !== "string") return undefined;

  return {
    token,
    clientId: typeof claims.client_id === "string" ? claims.client_id : "desconhecido",
    scopes: typeof claims.scope === "string" ? claims.scope.split(" ").filter(Boolean) : [],
    expiresAt: typeof claims.exp === "number" ? claims.exp : undefined,
    extra: { usuarioId: claims.sub },
  };
}
