import { describe, expect, it } from "vitest";

import { TmdbErro } from "@/lib/tmdb/cliente";
import { criarApiSeries } from "@/lib/tmdb/series";

import {
  chamada,
  detalhesSerieTmdb,
  montarApi,
  paginaTmdb,
  serieTmdb,
  temporadaTmdb,
} from "./fixtures";

const montar = (corpo: unknown, status?: number) => montarApi(criarApiSeries, corpo, status);

describe("descobrirSeries", () => {
  it("traduz os filtros para os parâmetros do /discover/tv, sem region", async () => {
    const { api, fetchFalso } = montar(paginaTmdb([]));

    await api.descobrirSeries({
      todosGeneros: [35, 18],
      semGeneros: [16],
      provedores: [8, 337],
      duracaoMin: 20,
      duracaoMax: 30,
      notaMin: 7,
      votosMin: 200,
      ano: 2015,
      lancadoAte: "2005-12-31",
      ordem: "lancamento",
      pagina: 3,
    });

    const { url, revalidate } = chamada(fetchFalso);
    expect(url.pathname).toBe("/3/discover/tv");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      with_genres: "35,18",
      without_genres: "16",
      with_watch_providers: "8|337",
      watch_region: "BR",
      with_watch_monetization_types: "flatrate",
      "with_runtime.gte": "20",
      "with_runtime.lte": "30",
      "vote_average.gte": "7",
      "vote_count.gte": "200",
      first_air_date_year: "2015",
      "first_air_date.lte": "2005-12-31",
      sort_by: "first_air_date.desc",
      page: "3",
      include_adult: "false",
      language: "pt-BR",
    });
    expect(revalidate).toBe(6 * 3600);
  });

  it("por padrão ordena por popularidade, na página 1, com qualquer um dos gêneros", async () => {
    const { api, fetchFalso } = montar(paginaTmdb([]));
    await api.descobrirSeries({ generos: [18, 35], pagina: 600 });
    await api.descobrirSeries({ ordem: "nota" });

    const primeira = chamada(fetchFalso).url.searchParams;
    expect(primeira.get("with_genres")).toBe("18|35");
    expect(primeira.get("sort_by")).toBe("popularity.desc");
    expect(primeira.get("page")).toBe("500");
    expect(chamada(fetchFalso, 1).url.searchParams.get("sort_by")).toBe("vote_average.desc");
  });

  it("converte a resposta em Pagina<SerieResumo>, com título e ano da estreia", async () => {
    const { api } = montar(
      paginaTmdb([serieTmdb(), serieTmdb({ id: 2, first_air_date: "", poster_path: null })]),
    );

    expect(await api.descobrirSeries()).toEqual({
      pagina: 1,
      totalPaginas: 3,
      totalResultados: 55,
      itens: [
        {
          id: 1399,
          titulo: "A Guerra dos Tronos",
          tituloOriginal: "Game of Thrones",
          sinopse: "Nove famílias nobres lutam pelo controle de Westeros.",
          posterPath: "/tronos.jpg",
          backdropPath: "/tronos-fundo.jpg",
          generos: [10765, 18],
          ano: 2011,
          nota: 8.5,
          votos: 25000,
          popularidade: 300.5,
        },
        expect.objectContaining({ id: 2, ano: null, posterPath: null }),
      ],
    });
  });
});

describe("obterSerie", () => {
  it("pede os dados anexos numa chamada e converte os detalhes", async () => {
    const { api, fetchFalso } = montar(detalhesSerieTmdb());

    const serie = await api.obterSerie(1399);

    const { url, revalidate } = chamada(fetchFalso);
    expect(url.pathname).toBe("/3/tv/1399");
    expect(url.searchParams.get("append_to_response")).toBe(
      "videos,credits,watch/providers,content_ratings",
    );
    expect(url.searchParams.get("language")).toBe("pt-BR");
    expect(revalidate).toBe(24 * 3600);

    expect(serie).toMatchObject({
      id: 1399,
      titulo: "A Guerra dos Tronos",
      ano: 2011,
      generos: [
        { id: 10765, nome: "Sci-Fi & Fantasy" },
        { id: 18, nome: "Drama" },
      ],
      duracaoEpisodioMin: 56,
      temporadas: [
        { numero: 1, nome: "Temporada 1", episodios: 10, ano: 2011, posterPath: "/t1.jpg" },
        { numero: 2, nome: "Temporada 2", episodios: 10, ano: 2012, posterPath: null },
      ],
      slogan: null,
      trailerYoutube: "oficial",
      criacao: ["David Benioff", "D. B. Weiss"],
      classificacao: "16",
      situacao: "Returning Series",
      proximoEpisodio: "2026-12-12",
      ondeAssistir: {
        assinatura: [{ id: 8, nome: "Netflix", logoPath: "/netflix.jpg" }],
        aluguel: [{ id: 2, nome: "Apple TV", logoPath: null }],
        compra: [],
      },
    });
    expect(serie?.elenco).toHaveLength(10);
    expect(serie?.elenco[0]).toEqual({ nome: "Ator 1", personagem: "Papel 1", fotoPath: null });
  });

  it("sem episode_run_time, usa a duração do último episódio; sem as duas, null", async () => {
    const ultimo = montar(detalhesSerieTmdb({ episode_run_time: [] }));
    expect((await ultimo.api.obterSerie(1399))?.duracaoEpisodioMin).toBe(80);

    const nenhuma = montar(detalhesSerieTmdb({ episode_run_time: [0], last_episode_to_air: null }));
    expect((await nenhuma.api.obterSerie(1399))?.duracaoEpisodioMin).toBeNull();
    expect((await nenhuma.api.obterSerie(1399))?.ultimoEpisodioDetalhes).toBeNull();
  });

  it("lê o último e o próximo episódio com temporada, número, nome e data", async () => {
    const { api } = montar(
      detalhesSerieTmdb({
        last_episode_to_air: {
          id: 63056,
          name: "O Inverno Chegou",
          season_number: 2,
          episode_number: 9,
          air_date: "2026-11-20",
          runtime: 55,
        },
        next_episode_to_air: { season_number: 2, episode_number: 10, air_date: "2026-12-12" },
      }),
    );

    const serie = await api.obterSerie(1399);

    expect(serie?.ultimoEpisodioDetalhes).toEqual({
      id: 63056,
      nome: "O Inverno Chegou",
      temporadaNumero: 2,
      episodioNumero: 9,
      data: "2026-11-20",
    });
    expect(serie?.proximoEpisodioDetalhes).toEqual({
      id: null,
      nome: null,
      temporadaNumero: 2,
      episodioNumero: 10,
      data: "2026-12-12",
    });
  });

  it("sem a classificação do Brasil, usa a dos EUA convertida", async () => {
    const semBrasil = montar(
      detalhesSerieTmdb({ content_ratings: { results: [{ iso_3166_1: "US", rating: "TV-MA" }] } }),
    );
    expect((await semBrasil.api.obterSerie(1399))?.classificacao).toBe("16");
  });

  it("classificação fora das tabelas, ou só de outro país, vira null", async () => {
    const desconhecida = montar(
      detalhesSerieTmdb({
        content_ratings: {
          results: [
            { iso_3166_1: "BR", rating: "ER" },
            { iso_3166_1: "DE", rating: "16" },
          ],
        },
      }),
    );
    expect((await desconhecida.api.obterSerie(1399))?.classificacao).toBeNull();
  });

  it("aceita os campos opcionais ausentes", async () => {
    const corpo: Record<string, unknown> = detalhesSerieTmdb();
    for (const campo of [
      "episode_run_time",
      "seasons",
      "created_by",
      "content_ratings",
      "videos",
      "status",
      "next_episode_to_air",
    ]) {
      delete corpo[campo];
    }
    const { api } = montar(corpo);

    expect(await api.obterSerie(1399)).toMatchObject({
      duracaoEpisodioMin: 80,
      temporadas: [],
      criacao: [],
      classificacao: null,
      trailerYoutube: null,
      situacao: null,
      proximoEpisodio: null,
    });
  });

  it("devolve null para 404", async () => {
    const { api } = montar({ status_code: 34 }, 404);
    expect(await api.obterSerie(1)).toBeNull();
  });

  it("resposta fora do formato vira TmdbErro", async () => {
    const { api } = montar({ id: 1399, name: 42 });
    await expect(api.obterSerie(1399)).rejects.toThrow(
      new TmdbErro("Resposta inesperada do TMDB", null),
    );
  });
});

describe("obterTemporada", () => {
  it("chama /tv/{id}/season/{n} com 24 h de cache e converte os episódios", async () => {
    const { api, fetchFalso } = montar(temporadaTmdb());

    expect(await api.obterTemporada(1399, 1)).toEqual({
      numero: 1,
      nome: "Temporada 1",
      sinopse: "O inverno está chegando.",
      ano: 2011,
      posterPath: "/t1.jpg",
      episodios: [
        {
          numero: 1,
          nome: "O Inverno Está Chegando",
          sinopse: "Ned Stark recebe uma visita.",
          duracaoMin: 62,
          data: "2011-04-17",
          stillPath: "/e1.jpg",
          nota: 8.1,
        },
        // Duração 0 e nota sem votos viram null.
        {
          numero: 2,
          nome: "A Estrada do Rei",
          sinopse: "",
          duracaoMin: null,
          data: "2099-04-24",
          stillPath: null,
          nota: null,
        },
      ],
    });
    const { url, revalidate } = chamada(fetchFalso);
    expect(url.pathname).toBe("/3/tv/1399/season/1");
    expect(url.searchParams.get("language")).toBe("pt-BR");
    expect(revalidate).toBe(24 * 3600);
  });

  it("aceita a temporada sem episódios, datas nem pôster", async () => {
    const { api } = montar(
      temporadaTmdb({ episodes: undefined, air_date: null, poster_path: null, overview: null }),
    );
    expect(await api.obterTemporada(1399, 1)).toMatchObject({
      sinopse: "",
      ano: null,
      posterPath: null,
      episodios: [],
    });
  });

  it("devolve null para 404", async () => {
    const { api } = montar({ status_code: 34 }, 404);
    expect(await api.obterTemporada(1399, 99)).toBeNull();
  });
});

describe("generosSeries", () => {
  it("chama /genre/tv/list com 24 h de cache e devolve id e nome", async () => {
    const { api, fetchFalso } = montar({
      genres: [
        { id: 10759, name: "Action & Adventure" },
        { id: 18, name: "Drama" },
      ],
    });

    expect(await api.generosSeries()).toEqual([
      { id: 10759, nome: "Action & Adventure" },
      { id: 18, nome: "Drama" },
    ]);
    const { url, revalidate } = chamada(fetchFalso);
    expect(url.pathname).toBe("/3/genre/tv/list");
    expect(revalidate).toBe(24 * 3600);
  });
});

describe("buscarSeries", () => {
  it("chama /search/tv com o texto sem espaços nas pontas e a página, e converte", async () => {
    const { api, fetchFalso } = montar(paginaTmdb([serieTmdb()]));

    const pagina = await api.buscarSeries("  guerra dos tronos ", 2);

    const { url, revalidate } = chamada(fetchFalso);
    expect(url.pathname).toBe("/3/search/tv");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      query: "guerra dos tronos",
      page: "2",
      include_adult: "false",
      language: "pt-BR",
    });
    expect(revalidate).toBe(6 * 3600);
    expect(pagina.itens).toEqual([
      expect.objectContaining({ id: 1399, titulo: "A Guerra dos Tronos", ano: 2011 }),
    ]);
    expect(pagina.totalResultados).toBe(55);
  });

  it("devolve página vazia sem chamar a API quando o texto é vazio", async () => {
    const { api, fetchFalso } = montar(paginaTmdb([]));
    expect(await api.buscarSeries("   ")).toEqual({
      itens: [],
      pagina: 1,
      totalPaginas: 0,
      totalResultados: 0,
    });
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});

describe("classificacaoSerie", () => {
  it("lê content_ratings, com cache de 7 dias, e usa a do Brasil", async () => {
    const { api, fetchFalso } = montar({
      id: 1399,
      results: [
        { iso_3166_1: "US", rating: "TV-MA" },
        { iso_3166_1: "BR", rating: "18" },
      ],
    });

    expect(await api.classificacaoSerie(1399)).toBe("18");
    const { url, revalidate } = chamada(fetchFalso);
    expect(url.pathname).toBe("/3/tv/1399/content_ratings");
    expect(revalidate).toBe(7 * 24 * 3600);
  });

  it("sem o Brasil, converte a dos EUA", async () => {
    const { api } = montar({ results: [{ iso_3166_1: "US", rating: "TV-Y7" }] });
    expect(await api.classificacaoSerie(1)).toBe("10");
  });
});
