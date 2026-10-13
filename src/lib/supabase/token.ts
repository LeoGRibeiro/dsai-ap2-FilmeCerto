import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export type ClienteSupabase = SupabaseClient<Database>;

/**
 * Cliente Supabase que age como o dono do access token (usado pelo MCP).
 * Sem sessão guardada: cada requisição traz o próprio token, e a RLS decide o acesso.
 */
export function clientePorToken(token: string): ClienteSupabase {
  const env = getPublicEnv();
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );
}
