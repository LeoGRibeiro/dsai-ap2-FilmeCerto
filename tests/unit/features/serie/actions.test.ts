import { revalidatePath } from "next/cache";
import { afterEach, describe, expect, it, vi } from "vitest";

import { alternarAcompanhamento, marcarAvisoLido } from "@/features/serie/actions";
import { definirAcompanhamento, marcarLido } from "@/features/serie/gravar";

import { formulario, logado } from "../../../support/actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/features/serie/gravar", () => ({
  definirAcompanhamento: vi.fn(),
  marcarLido: vi.fn(),
}));

const ID = "0b5f2c1e-6d4a-4f8b-9c3d-2e1a7b6c5d4e";
const cliente = { nome: "cliente" };
const SESSAO_EXPIRADA = { mensagem: "Sua sessão expirou. Entre novamente." };

afterEach(() => vi.clearAllMocks());

describe("alternarAcompanhamento", () => {
  it("acompanha a série e revalida a página dela e o início, não a rota /series", async () => {
    logado({ id: "u-1" }, cliente);
    vi.mocked(definirAcompanhamento).mockResolvedValue({ ok: true });

    const form = formulario({ tmdbId: "1399", acompanhar: "true" });
    expect(await alternarAcompanhamento({}, form)).toEqual({});

    expect(definirAcompanhamento).toHaveBeenCalledWith(
      expect.objectContaining(cliente),
      "u-1",
      1399,
      true,
    );
    expect(vi.mocked(revalidatePath).mock.calls).toEqual([["/serie/1399"], ["/dashboard"]]);
  });

  it("série inexistente e erro do banco viram mensagens", async () => {
    logado({ id: "u-1" });
    const form = formulario({ tmdbId: "1399", acompanhar: "false" });

    vi.mocked(definirAcompanhamento).mockResolvedValue({ ok: false, erro: "serie-nao-encontrada" });
    expect(await alternarAcompanhamento({}, form)).toEqual({ mensagem: "Série não encontrada." });

    vi.mocked(definirAcompanhamento).mockResolvedValue({ ok: false, erro: "banco" });
    expect((await alternarAcompanhamento({}, form)).mensagem).toMatch(/Não foi possível/);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("marcarAvisoLido", () => {
  it("marca o aviso da pessoa logada e revalida o início", async () => {
    logado({ id: "u-1" }, cliente);
    vi.mocked(marcarLido).mockResolvedValue(true);

    expect(await marcarAvisoLido({}, formulario({ id: ID }))).toEqual({});

    expect(marcarLido).toHaveBeenCalledWith(expect.objectContaining(cliente), "u-1", ID);
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith("/dashboard");
  });

  it("sem sessão, não grava", async () => {
    logado(null);

    expect(await marcarAvisoLido({}, formulario({ id: ID }))).toEqual(SESSAO_EXPIRADA);
    expect(marcarLido).not.toHaveBeenCalled();
  });

  it("ID que não é UUID ou erro do banco devolvem a mensagem, sem revalidar", async () => {
    logado({ id: "u-1" });
    vi.mocked(marcarLido).mockResolvedValue(false);

    for (const id of ["abc", ID]) {
      expect((await marcarAvisoLido({}, formulario({ id }))).mensagem).toBe(
        "Não foi possível marcar o aviso como lido. Tente novamente.",
      );
    }
    expect(marcarLido).toHaveBeenCalledTimes(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
