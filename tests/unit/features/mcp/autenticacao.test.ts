import { beforeEach, describe, expect, it, vi } from "vitest";

const getClaims = vi.fn();
vi.mock("@/lib/supabase/token", () => ({
  clientePorToken: () => ({ auth: { getClaims } }),
}));

import { verificarToken } from "@/features/mcp/autenticacao";

const req = new Request("http://localhost/api/mcp", { method: "POST" });

describe("verificarToken", () => {
  beforeEach(() => getClaims.mockReset());

  it("sem token devolve undefined e não consulta o Supabase", async () => {
    expect(await verificarToken(req, undefined)).toBeUndefined();
    expect(getClaims).not.toHaveBeenCalled();
  });

  it("token válido de usuário vira AuthInfo com o id do usuário", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u-1", role: "authenticated", client_id: "c-1", scope: "openid email", exp: 2000000000 } },
      error: null,
    });
    expect(await verificarToken(req, "jwt")).toEqual({
      token: "jwt",
      clientId: "c-1",
      scopes: ["openid", "email"],
      expiresAt: 2000000000,
      extra: { usuarioId: "u-1" },
    });
  });

  it("token inválido, anônimo ou sem sub devolve undefined", async () => {
    getClaims.mockResolvedValueOnce({ data: null, error: new Error("bad") });
    expect(await verificarToken(req, "x")).toBeUndefined();
    getClaims.mockResolvedValueOnce({ data: { claims: { sub: "u", role: "anon" } }, error: null });
    expect(await verificarToken(req, "x")).toBeUndefined();
    getClaims.mockResolvedValueOnce({ data: { claims: { role: "authenticated" } }, error: null });
    expect(await verificarToken(req, "x")).toBeUndefined();
  });
});
