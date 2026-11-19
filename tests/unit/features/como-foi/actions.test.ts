import { revalidatePath } from "next/cache";
import { afterEach, describe, expect, it, vi } from "vitest";

import { escolherFilme, exibirComoFoi, responderComoFoi } from "@/features/como-foi/actions";
import { contarExibicao, gravarEscolha, gravarResposta } from "@/features/como-foi/gravar";
import { createClient } from "@/lib/supabase/server";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/features/como-foi/gravar", () => ({
  gravarEscolha: vi.fn(),
  contarExibicao: vi.fn(),
  gravarResposta: vi.fn(),
}));

const cliente = { nome: "cliente" };

function logado(usuario: { id: string } | null) {
  vi.mocked(createClient).mockResolvedValue({
    ...cliente,
    auth: { getUser: async () => ({ data: { user: usuario } }) },
  } as never);
}

function formulario(id: string, resposta: string) {
  const form = new FormData();
  form.set("id", id);
  form.set("resposta", resposta);
  return form;
}

const SESSAO_EXPIRADA = { mensagem: "Sua sessão expirou. Entre de novo." };

afterEach(() => vi.clearAllMocks());

describe("escolherFilme", () => {
  it("grava a escolha do usuário logado", async () => {
    logado({ id: "u-1" });
    vi.mocked(gravarEscolha).mockResolvedValue({ ok: true, tipo: "filme", tmdbId: 550 });

    expect(await escolherFilme(550)).toEqual({});
    expect(gravarEscolha).toHaveBeenCalledWith(expect.objectContaining(cliente), {
      tipo: "filme",
      tmdbId: 550,
    });
  });

  it("grava a escolha de uma série com o tipo", async () => {
    logado({ id: "u-1" });
    vi.mocked(gravarEscolha).mockResolvedValue({ ok: true, tipo: "serie", tmdbId: 1399 });

    expect(await escolherFilme(1399, "serie")).toEqual({});
    expect(gravarEscolha).toHaveBeenCalledWith(expect.objectContaining(cliente), {
      tipo: "serie",
      tmdbId: 1399,
    });
  });

  it("diz 'Série não encontrada.' para série inexistente e recusa tipo desconhecido", async () => {
    logado({ id: "u-1" });
    vi.mocked(gravarEscolha).mockResolvedValue({ ok: false, erro: "filme-nao-encontrado" });

    expect(await escolherFilme(1399, "serie")).toEqual({ mensagem: "Série não encontrada." });
    expect(await escolherFilme(1399, "novela")).toEqual({ mensagem: "Filme não encontrado." });
    expect(gravarEscolha).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["filme-nao-encontrado", "Filme não encontrado."],
    ["banco", "Não foi possível guardar sua escolha agora. Tente de novo."],
  ] as const)("traduz o erro %s", async (erro, mensagem) => {
    logado({ id: "u-1" });
    vi.mocked(gravarEscolha).mockResolvedValue({ ok: false, erro });

    expect(await escolherFilme(550)).toEqual({ mensagem });
  });

  it("não grava sem sessão nem com ID inválido", async () => {
    logado(null);
    expect(await escolherFilme(550)).toEqual(SESSAO_EXPIRADA);
    expect(await escolherFilme("550")).toEqual({ mensagem: "Filme não encontrado." });
    expect(gravarEscolha).not.toHaveBeenCalled();
  });
});

describe("exibirComoFoi", () => {
  it("conta a exibição do usuário logado", async () => {
    logado({ id: "u-1" });

    await exibirComoFoi(7);

    expect(contarExibicao).toHaveBeenCalledWith(expect.objectContaining(cliente), 7);
  });

  it("não conta sem sessão nem com ID inválido", async () => {
    logado(null);
    await exibirComoFoi(7);
    logado({ id: "u-1" });
    await exibirComoFoi(-1);

    expect(contarExibicao).not.toHaveBeenCalled();
  });
});

describe("responderComoFoi", () => {
  it("grava a resposta e atualiza o dashboard, o filme e as listas", async () => {
    logado({ id: "u-1" });
    vi.mocked(gravarResposta).mockResolvedValue({ ok: true, tipo: "filme", tmdbId: 550 });

    expect(await responderComoFoi({}, formulario("7", "gostei"))).toEqual({});

    expect(gravarResposta).toHaveBeenCalledWith(
      expect.objectContaining(cliente),
      "u-1",
      7,
      "gostei",
    );
    expect(vi.mocked(revalidatePath).mock.calls.flat()).toEqual([
      "/dashboard",
      "/filme/550",
      "/listas",
    ]);
  });

  it("de uma série, atualiza a página da série", async () => {
    logado({ id: "u-1" });
    vi.mocked(gravarResposta).mockResolvedValue({ ok: true, tipo: "serie", tmdbId: 1399 });

    expect(await responderComoFoi({}, formulario("8", "amei"))).toEqual({});

    expect(revalidatePath).toHaveBeenCalledWith("/serie/1399");
    expect(revalidatePath).not.toHaveBeenCalledWith("/filme/1399");
  });

  it("devolve a mensagem de erro quando a gravação falha", async () => {
    logado({ id: "u-1" });
    vi.mocked(gravarResposta).mockResolvedValue({ ok: false, erro: "banco" });

    const estado = await responderComoFoi({}, formulario("7", "amei"));

    expect(estado.mensagem).toBe("Não foi possível salvar sua resposta agora. Tente de novo.");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ["resposta fora da lista", "7", "odiei"],
    ["ID inválido", "abc", "amei"],
  ])("recusa %s sem gravar", async (_caso, id, resposta) => {
    logado({ id: "u-1" });

    expect((await responderComoFoi({}, formulario(id, resposta))).mensagem).toMatch(
      /Não foi possível/,
    );
    expect(gravarResposta).not.toHaveBeenCalled();
  });

  it("pede login sem sessão", async () => {
    logado(null);

    expect(await responderComoFoi({}, formulario("7", "amei"))).toEqual(SESSAO_EXPIRADA);
    expect(gravarResposta).not.toHaveBeenCalled();
  });
});
