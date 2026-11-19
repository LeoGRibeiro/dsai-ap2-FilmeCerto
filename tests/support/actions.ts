import { vi } from "vitest";

import { createClient } from "@/lib/supabase/server";

/**
 * Para testes de Server Actions com `vi.mock("@/lib/supabase/server")`: o `createClient`
 * falso devolve um cliente cuja sessão é a do usuário dado (`null` = sessão expirada).
 */
export function logado(usuario: { id: string } | null, cliente: object = {}) {
  vi.mocked(createClient).mockResolvedValue({
    ...cliente,
    auth: { getUser: async () => ({ data: { user: usuario } }) },
  } as never);
}

/** `FormData` com os campos dados, como o navegador envia. */
export function formulario(campos: Record<string, string>) {
  const form = new FormData();
  for (const [nome, valor] of Object.entries(campos)) form.set(nome, valor);
  return form;
}
