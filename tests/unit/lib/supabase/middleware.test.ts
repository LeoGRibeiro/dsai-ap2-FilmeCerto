// @vitest-environment node
import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { updateSession } from "@/lib/supabase/middleware";

vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));
vi.mock("@/lib/env", () => ({
  getPublicEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: "http://supabase.test",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "chave-publica",
  }),
}));

const getUser = vi.fn();

function comClaims(claims: { sub: string; email?: string } | null) {
  vi.mocked(createServerClient).mockReturnValue({
    auth: { getClaims: async () => ({ data: claims && { claims }, error: null }), getUser },
  } as never);
}

afterEach(() => vi.clearAllMocks());

describe("updateSession", () => {
  it("reconhece o usuário pelas claims do JWT, sem ida ao servidor de Auth", async () => {
    comClaims({ sub: "u-1", email: "ana@exemplo.com" });

    const { user } = await updateSession(new NextRequest("http://localhost/dashboard"));

    expect(user).toEqual({ id: "u-1", email: "ana@exemplo.com" });
    expect(getUser).not.toHaveBeenCalled();
  });

  it("sem claims (sem sessão ou token inválido), o usuário é null", async () => {
    comClaims(null);

    const { user } = await updateSession(new NextRequest("http://localhost/dashboard"));

    expect(user).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("repassa para a resposta os cookies que o Supabase renovou", async () => {
    vi.mocked(createServerClient).mockImplementation((_url, _chave, opcoes) => {
      return {
        auth: {
          getClaims: async () => {
            opcoes.cookies.setAll?.([{ name: "sb-token", value: "novo", options: {} }], {});
            return { data: { claims: { sub: "u-1" } }, error: null };
          },
        },
      } as never;
    });

    const { response, user } = await updateSession(new NextRequest("http://localhost/listas"));

    expect(user).toEqual({ id: "u-1", email: "" });
    expect(response.cookies.get("sb-token")?.value).toBe("novo");
  });
});
