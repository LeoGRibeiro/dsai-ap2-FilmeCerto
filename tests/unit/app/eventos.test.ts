import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/eventos/route";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const insert = vi.fn();

function sessao(
  usuario: { id: string } | null,
  erroBanco: { code: string; message: string } | null = null,
) {
  insert.mockResolvedValue({ error: erroBanco });
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: usuario } }) },
    from: () => ({ insert }),
  } as never);
}

const postar = (corpo: string) =>
  POST(new Request("http://filme.test/api/eventos", { method: "POST", body: corpo }));

describe("POST /api/eventos", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    insert.mockReset();
  });

  it("grava o evento do usuário logado e responde 204", async () => {
    sessao({ id: "u-1" });

    const resposta = await postar(
      JSON.stringify({ nome: "trailer_aberto", dados: { origem: "filme" } }),
    );

    expect(resposta.status).toBe(204);
    expect(insert).toHaveBeenCalledWith({ nome: "trailer_aberto", dados: { origem: "filme" } });
  });

  it("responde 401 sem sessão e não grava", async () => {
    sessao(null);

    const resposta = await postar(JSON.stringify({ nome: "wizard_iniciado" }));

    expect(resposta.status).toBe(401);
    expect(insert).not.toHaveBeenCalled();
  });

  it.each([
    ["JSON quebrado", "{nome"],
    ["evento desconhecido", JSON.stringify({ nome: "login" })],
    ["clima nos dados", JSON.stringify({ nome: "wizard_concluido", dados: { humor: "cansado" } })],
    ["corpo grande demais", JSON.stringify({ nome: "wizard_iniciado", lixo: "x".repeat(3000) })],
  ])("responde 400 para %s", async (_caso, corpo) => {
    sessao({ id: "u-1" });

    expect((await postar(corpo)).status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("responde 500 quando o banco recusa", async () => {
    sessao({ id: "u-1" }, { code: "42501", message: "rls" });

    expect((await postar(JSON.stringify({ nome: "wizard_iniciado" }))).status).toBe(500);
  });
});
