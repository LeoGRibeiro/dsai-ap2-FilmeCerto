import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Clima } from "@/features/metricas/eventos";
import { concluirNoite } from "@/features/noite/actions";
import { idsParaExcluir, obterNoite } from "@/features/noite/consultas";
import { ESTADO_INICIAL } from "@/features/noite/estado";
import { createClient } from "@/lib/supabase/server";
import { descobrirFilmes, obterFilme } from "@/lib/tmdb/filmes";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/tmdb/filmes", () => ({ descobrirFilmes: vi.fn(), obterFilme: vi.fn() }));

type Erro = { code: string; message: string } | null;
type Linhas = { tmdb_id: number }[];

/** Supabase falso: guarda os filtros de cada tabela e responde com as linhas dadas. */
function bancoFalso(tabelas: { lista_itens?: Linhas; reacoes?: Linhas; erro?: Erro } = {}) {
  const filtros: Record<string, [string, unknown][]> = {};
  const insert = vi.fn(async () => ({ error: null }));
  const rpc = vi.fn(async () => ({ error: null }));
  const from = (tabela: "lista_itens" | "reacoes" | "eventos") => {
    filtros[tabela] = [];
    const resposta = { data: tabelas[tabela as "reacoes"] ?? [], error: tabelas.erro ?? null };
    const consulta = {
      select: () => consulta,
      eq: (coluna: string, valor: unknown) => {
        filtros[tabela]!.push([coluna, valor]);
        return consulta;
      },
      then: (resolver: (r: typeof resposta) => unknown) => Promise.resolve(resposta).then(resolver),
      insert,
    };
    return consulta;
  };
  return { cliente: { from, rpc } as never, filtros, insert, rpc };
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

  it("junta os filmes em 'Já assisti' e os com reação, sem ler 'Quero assistir'", async () => {
    const banco = bancoFalso({ lista_itens: [{ tmdb_id: 1 }], reacoes: [{ tmdb_id: 2 }] });

    expect(await idsParaExcluir(banco.cliente)).toEqual([1, 2]);
    expect(banco.filtros.lista_itens).toEqual([["status", "assistido"]]);
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
    }));

    const resultado = await obterNoite(respostas, ESTADO_INICIAL, {
      generosEvitados: [],
      streamings: [],
    });

    expect(resultado?.destaque.filme.id).toBe(2);
    expect(resultado?.destaque.motivo).toBe(
      "Você está ansioso, quer pensar e vai ver sozinho: ficção científica, nota 8,0, não está nos seus streamings.",
    );
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
