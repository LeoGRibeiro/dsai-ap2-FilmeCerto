import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { obterComoFoi } from "@/features/como-foi/consultas";
import { contarExibicao, gravarEscolha, gravarResposta } from "@/features/como-foi/gravar";

import { detalhes } from "../mcp/fakes";
import { bancoFalso, escolha, horasAtras } from "./banco-falso";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("gravarEscolha", () => {
  it("grava o filme com o título do TMDB e tipo filme", async () => {
    const banco = bancoFalso();

    const resultado = await gravarEscolha(banco.cliente, 550, async (id) =>
      detalhes(id, { titulo: "Clube da Luta" }),
    );

    expect(resultado).toEqual({ ok: true, tmdbId: 550 });
    expect(banco.escritas()).toEqual([
      {
        tabela: "escolhas_noite",
        op: "insert",
        valor: { tipo: "filme", tmdb_id: 550, titulo: "Clube da Luta" },
        filtros: [],
      },
    ]);
  });

  it.each([
    ["filme inexistente", async () => null, "filme-nao-encontrado"],
    [
      "TMDB fora do ar",
      async () => {
        throw new Error("fora");
      },
      "tmdb",
    ],
  ])("não grava nada com %s", async (_caso, buscar, erro) => {
    const banco = bancoFalso();

    expect(await gravarEscolha(banco.cliente, 550, buscar)).toEqual({ ok: false, erro });
    expect(banco.escritas()).toEqual([]);
  });
});

describe("obterComoFoi", () => {
  it("devolve a pergunta da escolha mais recente", async () => {
    const banco = bancoFalso({ linha: escolha() });

    expect(await obterComoFoi(banco.cliente)).toEqual({
      id: 7,
      tmdbId: 550,
      titulo: "Clube da Luta",
    });
  });

  it.each([
    ["escolhida há 1 hora", { escolhido_em: horasAtras(1) }],
    ["já respondida", { respondido_em: horasAtras(1) }],
    ["perguntada 2 vezes", { vezes_perguntado: 2, perguntado_em: horasAtras(10) }],
  ])("devolve null para escolha %s", async (_caso, dados) => {
    expect(await obterComoFoi(bancoFalso({ linha: escolha(dados) }).cliente)).toBeNull();
  });

  it("devolve null sem escolha e quando o banco falha", async () => {
    expect(await obterComoFoi(bancoFalso().cliente)).toBeNull();
    const erro = { code: "500", message: "fora" };
    expect(await obterComoFoi(bancoFalso({ linha: escolha(), erro }).cliente)).toBeNull();
  });
});

describe("contarExibicao", () => {
  it("numa visita nova, soma uma pergunta e registra como_foi_exibido", async () => {
    const linha = escolha({ vezes_perguntado: 1, perguntado_em: horasAtras(20) });
    const banco = bancoFalso({ linha });

    expect(await contarExibicao(banco.cliente, 7)).toBe(true);

    const [update, evento] = banco.escritas();
    expect(update).toMatchObject({
      tabela: "escolhas_noite",
      valor: { vezes_perguntado: 2 },
      filtros: [
        ["id", 7],
        ["vezes_perguntado", 1],
      ],
    });
    expect(evento).toMatchObject({
      tabela: "eventos",
      valor: { nome: "como_foi_exibido", dados: {} },
    });
  });

  it.each([
    ["na mesma visita", escolha({ vezes_perguntado: 1, perguntado_em: horasAtras(0.2) })],
    ["sem escolha", null],
    ["para escolha respondida", escolha({ respondido_em: horasAtras(1) })],
  ])("não grava nada %s", async (_caso, linha) => {
    const banco = bancoFalso({ linha });

    expect(await contarExibicao(banco.cliente, 7)).toBe(false);
    expect(banco.escritas()).toEqual([]);
  });
});

describe("gravarResposta", () => {
  const OK = { ok: true, titulo: "Clube da Luta", anterior: null, atual: null } as const;
  const gravacoes = () => ({
    definirReacao: vi.fn(async () => ({ ...OK, atual: "amei" as const })),
    definirLista: vi.fn(async () => ({ ...OK, atual: "assistido" as const })),
  });

  it("Amei grava a reação, 'Já assisti', a resposta e o evento", async () => {
    const banco = bancoFalso({ linha: escolha() });
    const g = gravacoes();

    expect(await gravarResposta(banco.cliente, "u-1", 7, "amei", g)).toEqual({
      ok: true,
      tmdbId: 550,
    });

    expect(g.definirReacao).toHaveBeenCalledWith(banco.cliente, "u-1", 550, "amei");
    expect(g.definirLista).toHaveBeenCalledWith(banco.cliente, "u-1", 550, "assistido");
    const [update, evento] = banco.escritas();
    expect(update).toMatchObject({ tabela: "escolhas_noite", filtros: [["id", 7]] });
    expect(update!.valor).toHaveProperty("respondido_em");
    expect(evento).toMatchObject({
      valor: { nome: "como_foi_respondido", dados: { resposta: "amei" } },
    });
  });

  it("'Não cheguei a ver' só marca como respondida", async () => {
    const banco = bancoFalso({ linha: escolha() });
    const g = gravacoes();

    expect((await gravarResposta(banco.cliente, "u-1", 7, "nao-vi", g)).ok).toBe(true);

    expect(g.definirReacao).not.toHaveBeenCalled();
    expect(g.definirLista).not.toHaveBeenCalled();
    expect(banco.escritas().map((c) => c.tabela)).toEqual(["escolhas_noite", "eventos"]);
  });

  it("se a reação falha, a pergunta continua pendente", async () => {
    const banco = bancoFalso({ linha: escolha() });
    const g = gravacoes();
    g.definirReacao.mockResolvedValue({ ok: false, erro: "banco" } as never);

    expect(await gravarResposta(banco.cliente, "u-1", 7, "gostei", g)).toEqual({
      ok: false,
      erro: "banco",
    });
    expect(g.definirLista).not.toHaveBeenCalled();
    expect(banco.escritas()).toEqual([]);
  });

  it.each([
    ["escolha inexistente", null, { ok: false, erro: "nao-encontrada" }],
    ["escolha já respondida", escolha({ respondido_em: horasAtras(1) }), { ok: true, tmdbId: 550 }],
  ])("%s não grava nada", async (_caso, linha, esperado) => {
    const banco = bancoFalso({ linha });
    const g = gravacoes();

    expect(await gravarResposta(banco.cliente, "u-1", 7, "amei", g)).toEqual(esperado);
    expect(g.definirReacao).not.toHaveBeenCalled();
    expect(banco.escritas()).toEqual([]);
  });
});
