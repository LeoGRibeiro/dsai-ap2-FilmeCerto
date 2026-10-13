import { beforeEach, describe, expect, it, vi } from "vitest";

const approve = vi.fn();
const deny = vi.fn();
const criarCliente = vi.fn(async () => ({ auth: { oauth: { approveAuthorization: approve, denyAuthorization: deny } } }));

vi.mock("@/lib/supabase/server", () => ({ createClient: () => criarCliente() }));
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  },
}));

import { decidirAutorizacao } from "@/features/oauth/actions";

function form(campos: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("decidirAutorizacao", () => {
  it("aprovar chama approveAuthorization e redireciona ao cliente", async () => {
    approve.mockResolvedValue({ data: { redirect_url: "https://agente.test/cb?code=1" }, error: null });
    await expect(decidirAutorizacao(form({ authorization_id: "abc-123", decisao: "aprovar" }))).rejects.toThrow(
      "REDIRECT:https://agente.test/cb?code=1",
    );
    expect(approve).toHaveBeenCalledWith("abc-123", { skipBrowserRedirect: true });
    expect(deny).not.toHaveBeenCalled();
  });

  it("negar chama denyAuthorization", async () => {
    deny.mockResolvedValue({ data: { redirect_url: "https://agente.test/cb?error=access_denied" }, error: null });
    await expect(decidirAutorizacao(form({ authorization_id: "abc-123", decisao: "negar" }))).rejects.toThrow(
      "REDIRECT:https://agente.test/cb?error=access_denied",
    );
    expect(deny).toHaveBeenCalledWith("abc-123", { skipBrowserRedirect: true });
    expect(approve).not.toHaveBeenCalled();
  });

  it("erro do Supabase volta à tela de consentimento com erro=1", async () => {
    approve.mockResolvedValue({ data: null, error: { message: "falhou" } });
    await expect(decidirAutorizacao(form({ authorization_id: "abc-123", decisao: "aprovar" }))).rejects.toThrow(
      "REDIRECT:/oauth/consent?authorization_id=abc-123&erro=1",
    );
  });

  it("redirect_url ausente volta à tela de consentimento com erro=1", async () => {
    approve.mockResolvedValue({ data: {}, error: null });
    await expect(decidirAutorizacao(form({ authorization_id: "abc-123", decisao: "aprovar" }))).rejects.toThrow(
      "REDIRECT:/oauth/consent?authorization_id=abc-123&erro=1",
    );
  });

  it.each([[{ decisao: "aprovar" }], [{ authorization_id: "../x", decisao: "aprovar" }]])(
    "id ausente ou inválido redireciona sem chamar o Supabase (%j)",
    async (campos) => {
      await expect(decidirAutorizacao(form(campos))).rejects.toThrow("REDIRECT:/oauth/consent");
      expect(criarCliente).not.toHaveBeenCalled();
      expect(approve).not.toHaveBeenCalled();
      expect(deny).not.toHaveBeenCalled();
    },
  );
});
