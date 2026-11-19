import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { alternarReacao } from "@/features/reacoes/actions";
import { obterReacao } from "@/features/reacoes/consultas";
import { definirReacao } from "@/features/reacoes/gravar";

import { formulario, logado } from "../../../support/actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/features/reacoes/consultas", () => ({ obterReacao: vi.fn() }));
vi.mock("@/features/reacoes/gravar", () => ({ definirReacao: vi.fn() }));

const OK = { ok: true, titulo: "X", anterior: null, atual: "amei" } as const;

beforeEach(() => {
  logado({ id: "u-1" });
  vi.mocked(obterReacao).mockResolvedValue(null);
  vi.mocked(definirReacao).mockResolvedValue(OK);
});
afterEach(() => vi.clearAllMocks());

describe("alternarReacao", () => {
  it("com tipo serie, grava a reação à série e revalida a página dela", async () => {
    const resposta = await alternarReacao(
      {},
      formulario({ tipo: "serie", tmdbId: "1399", reacao: "amei" }),
    );

    expect(resposta).toEqual({});
    const serie = { tipo: "serie", tmdbId: 1399 };
    expect(obterReacao).toHaveBeenCalledWith(serie, expect.anything());
    expect(definirReacao).toHaveBeenCalledWith(expect.anything(), "u-1", serie, "amei");
    expect(revalidatePath).toHaveBeenCalledWith("/serie/1399");
    expect(revalidatePath).not.toHaveBeenCalledWith("/filme/1399");
  });

  it("sem tipo, continua gravando o filme e revalidando /filme", async () => {
    await alternarReacao({}, formulario({ tmdbId: "550", reacao: "gostei" }));

    expect(definirReacao).toHaveBeenCalledWith(
      expect.anything(),
      "u-1",
      { tipo: "filme", tmdbId: 550 },
      "gostei",
    );
    expect(revalidatePath).toHaveBeenCalledWith("/filme/550");
  });

  it("clicar de novo na reação atual da série apaga", async () => {
    vi.mocked(obterReacao).mockResolvedValue("amei");

    await alternarReacao({}, formulario({ tipo: "serie", tmdbId: "1399", reacao: "amei" }));

    expect(definirReacao).toHaveBeenCalledWith(
      expect.anything(),
      "u-1",
      { tipo: "serie", tmdbId: 1399 },
      null,
    );
  });

  it("série inexistente vira 'Série não encontrada.'", async () => {
    vi.mocked(definirReacao).mockResolvedValue({ ok: false, erro: "filme-nao-encontrado" });

    expect(
      await alternarReacao({}, formulario({ tipo: "serie", tmdbId: "999", reacao: "amei" })),
    ).toEqual({ mensagem: "Série não encontrada." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("recusa tipo fora da lista sem gravar", async () => {
    expect(
      await alternarReacao({}, formulario({ tipo: "anime", tmdbId: "1", reacao: "amei" })),
    ).toEqual({ mensagem: "Não foi possível salvar sua reação agora. Tente de novo." });
    expect(definirReacao).not.toHaveBeenCalled();
  });

  it("sem sessão, não grava", async () => {
    logado(null);

    expect(
      await alternarReacao({}, formulario({ tipo: "serie", tmdbId: "1399", reacao: "amei" })),
    ).toEqual({ mensagem: "Sua sessão expirou. Entre de novo." });
    expect(definirReacao).not.toHaveBeenCalled();
  });
});
