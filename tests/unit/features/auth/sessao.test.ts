import { afterEach, describe, expect, it, vi } from "vitest";

import { obterUsuarioAtual } from "@/features/auth/sessao";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const getUser = vi.fn();
const perfilPedido = vi.fn();

function logado(claims: { sub: string; email?: string } | null, nome = "Ana") {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getClaims: async () => ({ data: claims && { claims }, error: null }), getUser },
    from: (tabela: string) => ({
      select: () => ({
        eq: (coluna: string, valor: string) => {
          perfilPedido(tabela, coluna, valor);
          return { maybeSingle: async () => ({ data: { nome } }) };
        },
      }),
    }),
  } as never);
}

afterEach(() => vi.clearAllMocks());

describe("obterUsuarioAtual", () => {
  it("monta o usuário com as claims do JWT e o nome do perfil, sem chamar getUser", async () => {
    logado({ sub: "u-1", email: "ana@exemplo.com" });

    expect(await obterUsuarioAtual()).toEqual({
      id: "u-1",
      email: "ana@exemplo.com",
      nome: "Ana",
    });
    expect(perfilPedido).toHaveBeenCalledWith("perfis", "id", "u-1");
    expect(getUser).not.toHaveBeenCalled();
  });

  it("sem claims, devolve null e não consulta o perfil", async () => {
    logado(null);

    expect(await obterUsuarioAtual()).toBeNull();
    expect(perfilPedido).not.toHaveBeenCalled();
  });
});
