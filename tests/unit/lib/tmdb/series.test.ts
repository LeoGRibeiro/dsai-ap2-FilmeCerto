import { describe, expect, it } from "vitest";

import { criarApiSeries } from "@/lib/tmdb/series";

import { chamada, montarApi, paginaTmdb, serieTmdb } from "./fixtures";

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
