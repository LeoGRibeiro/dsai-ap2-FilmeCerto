import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { obterFiltro } from "@/features/filtro-conteudo/consultas";
import type { Clima } from "@/features/metricas/eventos";
import { concluirNoite } from "@/features/noite/actions";
import { idsParaExcluir, obterNoite } from "@/features/noite/consultas";
import { ESTADO_INICIAL } from "@/features/noite/estado";
import { createClient } from "@/lib/supabase/server";
import { descobrirFilmes, obterFilme } from "@/lib/tmdb/filmes";
import { descobrirSeries, obterSerie } from "@/lib/tmdb/series";

import { bancoEmMemoria } from "../../../support/banco-memoria";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/tmdb/filmes", () => ({ descobrirFilmes: vi.fn(), obterFilme: vi.fn() }));
vi.mock("@/lib/tmdb/series", () => ({ descobrirSeries: vi.fn(), obterSerie: vi.fn() }));
vi.mock("@/features/filtro-conteudo/consultas", () => ({ obterFiltro: vi.fn(async () => null) }));

type Erro = { code: string; message: string } | null;
type Linhas = { tmdb_id: number }[];

/** Supabase falso: responde com as linhas dadas, sem filtrar (os filtros têm teste próprio). */
function bancoFalso(tabelas: { lista_itens?: Linhas; reacoes?: Linhas; erro?: Erro } = {}) {
  const insert = vi.fn(async () => ({ error: null }));
  const rpc = vi.fn(async () => ({ error: null }));
  const from = (tabela: "lista_itens" | "reacoes" | "eventos") => {
    const resposta = { data: tabelas[tabela as "reacoes"] ?? [], error: tabelas.erro ?? null };
    const consulta = {
      select: () => consulta,
      eq: () => consulta,
      then: (resolver: (r: typeof resposta) => unknown) => Promise.resolve(resposta).then(resolver),
      insert,
    };
    return consulta;
  };
  return { cliente: { from, rpc } as never, insert, rpc };
}

function logado(usuario: { id: string } | null, banco = bancoFalso()) {
  vi.mocked(createClient).mockResolvedValue({
    ...(banco.cliente as object),
    auth: { getUser: async () => ({ data: { user: usuario } }) },
  } as never);
  return banco;
}

const respostas: Clima = { humor: "ansioso", experiencia: "pensar", companhia: "sozinho" };

describe("idsParaExcluir", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("junta os filmes em 'Já assisti' e os com reação, sem 'Quero assistir' nem séries", async () => {
    const banco = bancoEmMemoria({
      lista_itens: [
        { tipo: "filme", tmdb_id: 1, status: "assistido" },
        { tipo: "filme", tmdb_id: 2, status: "quero_assistir" },
        { tipo: "serie", tmdb_id: 3, status: "assistido" },
      ],
      reacoes: [
        { tipo: "filme", tmdb_id: 4 },
        { tipo: "serie", tmdb_id: 5 },
      ],
    });

    expect(await idsParaExcluir(banco.cliente)).toEqual([1, 4]);
    // Para a série, o contrário: só as linhas de série.
    expect(await idsParaExcluir(banco.cliente, "serie")).toEqual([3, 5]);
  });

  it("lança quando o banco falha, para não recomendar filme já visto", async () => {
    const banco = bancoFalso({ erro: { code: "500", message: "fora" } });

    await expect(idsParaExcluir(banco.cliente)).rejects.toThrow("Não foi possível");
  });
});

describe("obterNoite", () => {
  it("recomenda com o TMDB real, excluindo o que vem do banco", async () => {
    logado({ id: "u-1" }, bancoFalso({ lista_itens: [{ tmdb_id: 1 }] }));
    vi.mocked(descobrirFilmes).mockResolvedValue({
      itens: [1, 2].map((id) => ({
        id,
        titulo: `Filme ${id}`,
        tituloOriginal: "",
        sinopse: "",
        posterPath: null,
        backdropPath: null,
        generos: [878],
        ano: 2001,
        nota: 8,
        votos: 900,
        popularidade: 1,
      })),
      pagina: 1,
      totalPaginas: 1,
      totalResultados: 2,
    });
    vi.mocked(obterFilme).mockImplementation(async (id) => ({
      id,
      titulo: `Filme ${id}`,
      tituloOriginal: "",
      sinopse: "",
      posterPath: null,
      backdropPath: null,
      generos: [],
      ano: 2001,
      nota: 8,
      votos: 900,
      popularidade: 1,
      duracaoMin: 100,
      slogan: null,
      trailerYoutube: null,
      elenco: [],
      direcao: [],
      ondeAssistir: null,
      parecidos: [],
      classificacao: null,
    }));

    const resultado = await obterNoite(respostas, ESTADO_INICIAL, {
      generosEvitados: [],
      streamings: [],
    });

    expect(resultado?.destaque.filme.id).toBe(2);
    expect(resultado?.destaque.motivo).toBe(
      "Você está ansioso, quer pensar e vai ver sozinho: ficção científica, nota 8,0, não está nos seus streamings.",
    );
    expect(descobrirFilmes).toHaveBeenCalledWith(
      expect.not.objectContaining({ classificacaoMax: expect.anything() }),
    );
  });

  it("com filtro por idade, a descoberta de filmes vai até o limite dele", async () => {
    logado({ id: "u-1" }, bancoFalso());
    vi.mocked(obterFiltro).mockResolvedValueOnce("10");
    vi.mocked(descobrirFilmes).mockClear();

    await obterNoite(respostas, ESTADO_INICIAL, { generosEvitados: [], streamings: [] });

    expect(descobrirFilmes).toHaveBeenCalledWith(
      expect.objectContaining({ classificacaoMax: "10" }),
    );
  });
});

describe("obterNoite de série", () => {
  it("usa o TMDB de séries e nunca o de filmes", async () => {
    logado({ id: "u-1" }, bancoFalso({ lista_itens: [{ tmdb_id: 1 }] }));
    const resumo = (id: number) => ({
      id,
      titulo: `Série ${id}`,
      tituloOriginal: "",
      sinopse: "",
      posterPath: null,
      backdropPath: null,
      generos: [10765],
      ano: 2015,
      nota: 8.4,
      votos: 900,
      popularidade: 1,
    });
    vi.mocked(descobrirSeries).mockResolvedValue({
      itens: [resumo(1), resumo(2)],
      pagina: 1,
      totalPaginas: 1,
      totalResultados: 2,
    });
    vi.mocked(obterSerie).mockImplementation(async (id) => ({
      ...resumo(id),
      generos: [],
      duracaoEpisodioMin: 48,
      temporadas: [],
      slogan: null,
      trailerYoutube: null,
      elenco: [],
      criacao: [],
      classificacao: "14",
      ondeAssistir: null,
    }));
    vi.mocked(descobrirFilmes).mockClear();

    const resultado = await obterNoite(
      respostas,
      { ...ESTADO_INICIAL, tipo: "serie" },
      { generosEvitados: [], streamings: [] },
    );

    expect(resultado?.destaque.filme).toMatchObject({ id: 2, titulo: "Série 2", duracaoMin: 48 });
    expect(descobrirSeries).toHaveBeenCalledWith(
      expect.objectContaining({ todosGeneros: [10765] }),
    );
    expect(descobrirFilmes).not.toHaveBeenCalled();
  });

  it("com filtro por idade, a série +18 não é recomendada", async () => {
    logado({ id: "u-1" }, bancoFalso());
    const original = vi.mocked(obterSerie).getMockImplementation()!;
    vi.mocked(obterSerie).mockImplementation(async (id) => ({
      ...(await original(id))!,
      classificacao: id === 1 ? "18" : "14",
    }));

    const semFiltro = await obterNoite(
      respostas,
      { ...ESTADO_INICIAL, tipo: "serie" },
      { generosEvitados: [], streamings: [] },
    );
    expect(semFiltro?.destaque.filme.id).toBe(1);

    vi.mocked(obterFiltro).mockResolvedValueOnce("18");
    const comFiltro = await obterNoite(
      respostas,
      { ...ESTADO_INICIAL, tipo: "serie" },
      { generosEvitados: [], streamings: [] },
    );
    expect(comFiltro?.destaque.filme.id).toBe(2);
  });
});

describe("concluirNoite", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("registra wizard_concluido sem as respostas e conta o clima à parte", async () => {
    const banco = logado({ id: "u-1" });

    await concluirNoite(respostas);

    expect(banco.insert).toHaveBeenCalledWith({ nome: "wizard_concluido", dados: {} });
    expect(banco.rpc).toHaveBeenCalledWith("registrar_clima", {
      p_humor: "ansioso",
      p_experiencia: "pensar",
      p_companhia: "sozinho",
    });
  });

  it("não registra nada sem sessão", async () => {
    const banco = logado(null);

    await concluirNoite(respostas);

    expect(banco.insert).not.toHaveBeenCalled();
    expect(banco.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["resposta fora da lista", { ...respostas, humor: "feliz" }],
    ["respostas incompletas", { humor: "ansioso" }],
    ["valor que não é objeto", "ansioso"],
  ])("não registra nada com %s", async (_caso, valor) => {
    const banco = logado({ id: "u-1" });

    await concluirNoite(valor);

    expect(createClient).not.toHaveBeenCalled();
    expect(banco.insert).not.toHaveBeenCalled();
  });
});
