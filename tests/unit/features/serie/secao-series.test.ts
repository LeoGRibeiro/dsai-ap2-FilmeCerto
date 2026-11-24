import { describe, expect, it, vi } from "vitest";

import {
  filtrosSecaoSeries,
  montarSecaoSeries,
  type ApiSecaoSeries,
  type EntradaSecaoSeries,
} from "@/features/serie/secao-series";
import { TmdbErro } from "@/lib/tmdb/cliente";
import type { ClassificacaoBR, FiltrosDescobertaSerie, SerieResumo } from "@/lib/tmdb/tipos";

import { filme } from "../recomendacao/fabrica";

// Gêneros de TV do TMDB (/genre/tv/list).
const ACAO_AVENTURA = 10759;
const DRAMA = 18;
const SCI_FI_FANTASIA = 10765;
const FORA = [10763, 10764, 10767, 10762]; // News, Reality, Talk, Kids

const serie = (id: number, generos = [ACAO_AVENTURA]): SerieResumo =>
  filme(id, { titulo: `Série ${id}`, generos, popularidade: 100 - id });

/** TMDB falso: `total` séries de ação e aventura; com `falhar`, o discover responde 503. */
const CLASSIFICACOES_SERIES: Partial<Record<number, ClassificacaoBR | null>> = {
  2: "18",
  3: "14",
  4: null,
};

function apiFalsa({ total = 20, falhar = false } = {}) {
  return {
    descobrirSeries: vi.fn(async (filtros: FiltrosDescobertaSerie = {}) => {
      if (falhar) throw new TmdbErro("TMDB respondeu 503", 503);
      const itens = Array.from({ length: total }, (_, i) => serie(i + 1));
      return { itens, pagina: filtros.pagina ?? 1, totalPaginas: 5, totalResultados: total };
    }),
    generosSeries: vi.fn(async () => [
      { id: ACAO_AVENTURA, nome: "Action & Adventure" },
      { id: DRAMA, nome: "Drama" },
      { id: SCI_FI_FANTASIA, nome: "Sci-Fi & Fantasy" },
    ]),
    // A série 2 é +18, a 3 é 14, a 4 não tem classificação; as outras, 10.
    classificacaoSerie: vi.fn(async (id: number) => CLASSIFICACOES_SERIES[id] ?? "10"),
  } satisfies ApiSecaoSeries;
}

const entrada = (sobrescrever: Partial<EntradaSecaoSeries> = {}): EntradaSecaoSeries => ({
  preferencias: { generos: [28, 27], frequencia: "semanal" },
  rodada: 0,
  excluir: [],
  ...sobrescrever,
});

describe("filtrosSecaoSeries", () => {
  it("favoritos [28, 27] pedem só Action & Adventure (Terror não tem equivalente)", () => {
    expect(filtrosSecaoSeries(entrada()).generos).toEqual([ACAO_AVENTURA]);
  });

  it("só com favoritos sem equivalente em TV, não filtra por gênero", () => {
    const filtros = filtrosSecaoSeries(
      entrada({ preferencias: { generos: [27], frequencia: "semanal" } }),
    );
    expect(filtros.generos).toBeUndefined();
  });

  it("semGeneros traz os evitados convertidos e a exclusão fixa", () => {
    const filtros = filtrosSecaoSeries(
      entrada({
        preferencias: { generos: [18], generosEvitados: [878, 14, 53], frequencia: "semanal" },
      }),
    );
    expect(filtros.semGeneros).toEqual([SCI_FI_FANTASIA, ...FORA]);
  });

  it("um evitado vence o favorito que vira o mesmo gênero de TV", () => {
    const filtros = filtrosSecaoSeries(
      entrada({
        preferencias: { generos: [28, 18], generosEvitados: [12], frequencia: "semanal" },
      }),
    );
    expect(filtros.generos).toEqual([DRAMA]);
    expect(filtros.semGeneros).toEqual([ACAO_AVENTURA, ...FORA]);
  });

  it("sem evitados, semGeneros é só a exclusão fixa", () => {
    expect(filtrosSecaoSeries(entrada()).semGeneros).toEqual(FORA);
  });

  it("episódios de até 60 min, votos e nota do perfil da frequência, por popularidade", () => {
    expect(filtrosSecaoSeries(entrada())).toMatchObject({
      duracaoMax: 60,
      votosMin: 300,
      notaMin: 6.5,
      ordem: "popularidade",
    });
    const raramente = filtrosSecaoSeries(
      entrada({ preferencias: { generos: [18], frequencia: "raramente" } }),
    );
    expect(raramente).toMatchObject({ votosMin: 2000, notaMin: 7 });
  });

  it("a rodada muda a página, dando a volta em paginaMax", () => {
    // "semanal" tem paginaMax 5.
    const pagina = (rodada: number) => filtrosSecaoSeries(entrada({ rodada })).pagina;
    expect([0, 1, 4, 5].map(pagina)).toEqual([1, 2, 5, 1]);
  });
});

describe("montarSecaoSeries", () => {
  it("pede ao TMDB os filtros da seção, com a página da rodada", async () => {
    const api = apiFalsa();
    await montarSecaoSeries(entrada({ rodada: 2 }), api);
    expect(api.descobrirSeries).toHaveBeenCalledWith(
      expect.objectContaining({ generos: [ACAO_AVENTURA], pagina: 3, duracaoMax: 60 }),
    );
  });

  it("devolve a seção de séries com até 12 cartões que levam à série", async () => {
    const secao = await montarSecaoSeries(entrada(), apiFalsa());
    expect(secao).toMatchObject({ id: "series", titulo: "Séries para hoje à noite" });
    expect(secao?.erro).toBeUndefined();
    expect(secao?.filmes).toHaveLength(12);
    expect(secao?.filmes.every((cartao) => cartao.tipo === "serie")).toBe(true);
  });

  it("o motivo usa o nome do gênero de TV", async () => {
    const secao = await montarSecaoSeries(entrada(), apiFalsa());
    expect(secao?.filmes[0]?.motivo).toBe("Porque você curte Action & Adventure");
  });

  it("séries com reação ou em lista saem", async () => {
    const secao = await montarSecaoSeries(entrada({ excluir: [1, 3] }), apiFalsa());
    const ids = secao?.filmes.map((cartao) => cartao.id);
    expect(ids).not.toContain(1);
    expect(ids).not.toContain(3);
    expect(ids?.[0]).toBe(2);
  });

  it("sem filtro, não consulta classificação; com filtro, a série +18 sai", async () => {
    const sem = apiFalsa();
    const semFiltro = await montarSecaoSeries(entrada(), sem);
    expect(sem.classificacaoSerie).not.toHaveBeenCalled();
    expect(semFiltro?.filmes.map((cartao) => cartao.id)).toContain(2);

    const com = apiFalsa();
    const comFiltro = await montarSecaoSeries(entrada({ filtro: "18" }), com);
    expect(comFiltro?.filmes.map((cartao) => cartao.id).slice(0, 3)).toEqual([1, 3, 4]);
    expect(comFiltro?.filmes).toHaveLength(12);
  });

  it("com Até 10 anos, sai também a série 14; a sem classificação fica", async () => {
    const secao = await montarSecaoSeries(entrada({ filtro: "10" }), apiFalsa());
    expect(secao?.filmes.map((cartao) => cartao.id).slice(0, 3)).toEqual([1, 4, 5]);
  });

  it("com menos de 4 séries restantes, a seção é null", async () => {
    expect(await montarSecaoSeries(entrada({ excluir: [1, 2] }), apiFalsa({ total: 5 }))).toBe(
      null,
    );
    const quatro = await montarSecaoSeries(entrada({ excluir: [1] }), apiFalsa({ total: 5 }));
    expect(quatro?.filmes).toHaveLength(4);
  });

  it("TMDB com erro devolve a seção com erro e sem cartões", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const secao = await montarSecaoSeries(entrada(), apiFalsa({ falhar: true }));
    expect(secao).toEqual({
      id: "series",
      titulo: "Séries para hoje à noite",
      filmes: [],
      erro: true,
    });
    expect(erro).toHaveBeenCalled();
    erro.mockRestore();
  });
});
