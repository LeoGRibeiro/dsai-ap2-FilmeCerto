import { describe, expect, it, vi } from "vitest";

import { buscarFilmes } from "@/features/mcp/tools/buscar-filmes";
import { detalhesFilme } from "@/features/mcp/tools/detalhes-filme";
import { MSG } from "@/features/mcp/formatar";
import { recomendarFilmes } from "@/features/mcp/tools/recomendar-filmes";
import { verListas } from "@/features/mcp/tools/ver-listas";
import { TmdbErro } from "@/lib/tmdb/cliente";

import { contexto, dadosFalsos, ORIGEM, resumo } from "./fakes";

const json = (r: { content: { text: string }[] }) => JSON.parse(r.content[0].text);

describe("entradas", () => {
  it("rejeitam valores inválidos", () => {
    expect(buscarFilmes.entrada.safeParse({ texto: "a" }).success).toBe(false);
    expect(buscarFilmes.entrada.safeParse({ texto: "Duna", pagina: 501 }).success).toBe(false);
    expect(detalhesFilme.entrada.safeParse({ tmdb_id: 0 }).success).toBe(false);
    expect(detalhesFilme.entrada.safeParse({ tmdb_id: 1.5 }).success).toBe(false);
    expect(recomendarFilmes.entrada.safeParse({ por_secao: 21 }).success).toBe(false);
    expect(verListas.entrada.safeParse({ lista: "favoritos" }).success).toBe(false);
  });
  it("aplicam padrões", () => {
    expect(buscarFilmes.entrada.parse({ texto: " Duna " })).toEqual({ texto: "Duna", pagina: 1 });
    expect(recomendarFilmes.entrada.parse({})).toEqual({ por_secao: 5, rodada: 0 });
  });
  it("leitura é readOnly", () => {
    for (const t of [buscarFilmes, detalhesFilme, recomendarFilmes, verListas]) {
      expect(t.anotacoes.readOnlyHint).toBe(true);
    }
  });
});

describe("buscar_filmes", () => {
  it("devolve resumos com sinopse curta e paginação", async () => {
    const ctx = contexto();
    vi.mocked(ctx.tmdb.buscarFilmes).mockResolvedValue({
      itens: [resumo(7, { sinopse: "x".repeat(300) })], pagina: 2, totalPaginas: 4, totalResultados: 70,
    });
    const r = json(await buscarFilmes.executar({ texto: "Duna", pagina: 2 }, ctx));
    expect(ctx.tmdb.buscarFilmes).toHaveBeenCalledWith("Duna", 2);
    expect(r.pagina).toBe(2);
    expect(r.total_paginas).toBe(4);
    expect(r.filmes[0]).toMatchObject({ tmdb_id: 7, generos: ["Drama"], link: `${ORIGEM}/filme/7` });
    expect(r.filmes[0].sinopse).toHaveLength(200);
  });
  it("TMDB fora do ar vira isError", async () => {
    const ctx = contexto();
    vi.mocked(ctx.tmdb.buscarFilmes).mockRejectedValue(new TmdbErro("x", 503));
    const r = await buscarFilmes.executar({ texto: "Duna", pagina: 1 }, ctx);
    expect(r.isError).toBe(true);
  });
});

describe("detalhes_filme", () => {
  it("junta TMDB, streamings do usuário e estado do filme", async () => {
    const ctx = contexto({
      dados: dadosFalsos({ estadoFilme: vi.fn(async () => ({ lista: "quero_assistir" as const, reacao: "amei" as const })) }),
    });
    const r = json(await detalhesFilme.executar({ tmdb_id: 9 }, ctx));
    expect(r).toMatchObject({
      tmdb_id: 9, duracao_min: 120, direcao: ["Diretora"], generos: ["Drama"],
      onde_assistir: { assinatura: ["Netflix"], aluguel: [], compra: ["Apple TV"] },
      nos_meus_streamings: ["Netflix"], minha_lista: "quero_assistir", minha_reacao: "amei",
      link: `${ORIGEM}/filme/9`,
    });
    expect(r.elenco).toHaveLength(5);
  });
  it("filme inexistente vira isError", async () => {
    const ctx = contexto();
    vi.mocked(ctx.tmdb.obterFilme).mockResolvedValue(null);
    const r = await detalhesFilme.executar({ tmdb_id: 9 }, ctx);
    expect(r).toEqual({ content: [{ type: "text", text: "Filme não encontrado." }], isError: true });
  });
  it("sem preferências, nos_meus_streamings vem vazio", async () => {
    const ctx = contexto({ dados: dadosFalsos({ preferencias: vi.fn(async () => null) }) });
    expect(json(await detalhesFilme.executar({ tmdb_id: 9 }, ctx)).nos_meus_streamings).toEqual([]);
  });
});

describe("recomendar_filmes", () => {
  it("devolve seções com motivo, limitadas por_secao", async () => {
    const ctx = contexto();
    const r = json(await recomendarFilmes.executar({ por_secao: 1, rodada: 0 }, ctx));
    expect(r.secoes.length).toBeGreaterThan(0);
    for (const secao of r.secoes) {
      expect(secao.filmes.length).toBeLessThanOrEqual(1);
      expect(typeof secao.titulo).toBe("string");
      expect(typeof secao.filmes[0].motivo).toBe("string");
    }
  });
  it("exclui filmes das listas e já avaliados, e devolve a rodada", async () => {
    const ctx = contexto({
      dados: dadosFalsos({
        idsNasListas: vi.fn(async () => [1]),
        reacoes: vi.fn(async () => [{ tmdbId: 2, reacao: "amei" as const, generos: [18], titulo: "B" }]),
      }),
    });
    vi.mocked(ctx.motor.descobrirFilmes).mockResolvedValue({
      itens: [resumo(1), resumo(2), resumo(3)], pagina: 1, totalPaginas: 1, totalResultados: 3,
    });
    const r = json(await recomendarFilmes.executar({ por_secao: 20, rodada: 3 }, ctx));
    expect(r.rodada).toBe(3);
    const ids = r.secoes.flatMap((s: { filmes: { tmdb_id: number }[] }) => s.filmes.map((f) => f.tmdb_id));
    expect(ids).toContain(3);
    expect(ids).not.toContain(1);
    expect(ids).not.toContain(2);
  });
  it("TMDB fora do ar em todas as seções vira isError", async () => {
    const ctx = contexto();
    vi.mocked(ctx.motor.descobrirFilmes).mockRejectedValue(new TmdbErro("fora", null));
    vi.mocked(ctx.motor.recomendacoesDe).mockRejectedValue(new TmdbErro("fora", null));
    const r = await recomendarFilmes.executar({ por_secao: 5, rodada: 0 }, ctx);
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toBe(MSG.tmdb);
  });
  it("sem preferências, isError apontando o onboarding", async () => {
    const ctx = contexto({ dados: dadosFalsos({ preferencias: vi.fn(async () => null) }) });
    const r = await recomendarFilmes.executar({ por_secao: 5, rodada: 0 }, ctx);
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain(`${ORIGEM}/onboarding`);
  });
});

describe("ver_listas", () => {
  const itens = [
    { tmdbId: 1, status: "quero_assistir" as const, titulo: "A", posterPath: null, ano: 2000, reacao: null },
    { tmdbId: 2, status: "assistido" as const, titulo: "B", posterPath: null, ano: null, reacao: "amei" as const },
  ];
  it("separa as duas listas e filtra quando pedido", async () => {
    const ctx = contexto({ dados: dadosFalsos({ itensLista: vi.fn(async () => itens) }) });
    expect(json(await verListas.executar({}, ctx))).toEqual({
      quero_assistir: [{ tmdb_id: 1, titulo: "A", ano: 2000, minha_reacao: null, link: `${ORIGEM}/filme/1` }],
      assistido: [{ tmdb_id: 2, titulo: "B", ano: null, minha_reacao: "amei", link: `${ORIGEM}/filme/2` }],
    });
    expect(Object.keys(json(await verListas.executar({ lista: "assistido" }, ctx)))).toEqual(["assistido"]);
  });
  it("falha do banco vira isError", async () => {
    const ctx = contexto({ dados: dadosFalsos({ itensLista: vi.fn(async () => { throw new Error("db"); }) }) });
    expect((await verListas.executar({}, ctx)).isError).toBe(true);
  });
});
