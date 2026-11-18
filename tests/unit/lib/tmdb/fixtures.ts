import { vi } from "vitest";

import { criarClienteTmdb, type ClienteTmdb } from "@/lib/tmdb/cliente";

/** Respostas reduzidas no formato da API do TMDB, para os testes. */

/** API do TMDB (filmes ou séries) sobre um `fetch` falso que sempre responde `corpo`. */
export function montarApi<A>(criarApi: (cliente: ClienteTmdb) => A, corpo: unknown, status = 200) {
  const fetchFalso = vi.fn(async () => new Response(JSON.stringify(corpo), { status }));
  const cliente = criarClienteTmdb({
    token: "t",
    baseUrl: "https://tmdb.falso/3",
    fetch: fetchFalso as unknown as typeof fetch,
    esperar: async () => {},
  });
  return { api: criarApi(cliente), fetchFalso };
}

/** URL e `revalidate` da chamada de número `indice` ao `fetch` falso. */
export function chamada(fetchFalso: ReturnType<typeof vi.fn>, indice = 0) {
  const [url, init] = fetchFalso.mock.calls[indice] as [string, { next: { revalidate: number } }];
  return { url: new URL(url), revalidate: init.next.revalidate };
}

export function filmeTmdb(sobrescrever: Record<string, unknown> = {}) {
  return {
    id: 550,
    title: "Clube da Luta",
    original_title: "Fight Club",
    overview: "Um homem deprimido...",
    poster_path: "/poster.jpg",
    backdrop_path: "/fundo.jpg",
    genre_ids: [18, 53],
    release_date: "1999-10-15",
    vote_average: 8.4,
    vote_count: 30000,
    popularity: 70.5,
    adult: false,
    ...sobrescrever,
  };
}

export function paginaTmdb(resultados: unknown[], pagina = 1) {
  return { page: pagina, results: resultados, total_pages: 3, total_results: 55 };
}

export function detalhesTmdb(sobrescrever: Record<string, unknown> = {}) {
  const base: Record<string, unknown> = filmeTmdb();
  delete base.genre_ids;
  return {
    ...base,
    genres: [
      { id: 18, name: "Drama" },
      { id: 53, name: "Thriller" },
    ],
    runtime: 139,
    tagline: "",
    videos: {
      results: [
        { key: "teaser1", site: "YouTube", type: "Teaser", official: true },
        { key: "naoOficial", site: "YouTube", type: "Trailer", official: false },
        { key: "vimeo1", site: "Vimeo", type: "Trailer", official: true },
        { key: "oficial", site: "YouTube", type: "Trailer", official: true },
      ],
    },
    credits: {
      cast: Array.from({ length: 12 }, (_, i) => ({
        name: `Ator ${i + 1}`,
        character: `Papel ${i + 1}`,
        profile_path: i === 0 ? null : `/ator${i + 1}.jpg`,
        order: i,
      })),
      crew: [
        { name: "David Fincher", job: "Director" },
        { name: "Jim Uhls", job: "Screenplay" },
      ],
    },
    "watch/providers": {
      results: {
        BR: {
          link: "https://www.themoviedb.org/movie/550/watch?locale=BR",
          flatrate: [{ provider_id: 8, provider_name: "Netflix", logo_path: "/netflix.jpg" }],
          rent: [{ provider_id: 2, provider_name: "Apple TV", logo_path: null }],
        },
        US: { link: "https://example.com", buy: [] },
      },
    },
    recommendations: paginaTmdb([filmeTmdb({ id: 807, title: "Se7en" })]),
    ...sobrescrever,
  };
}

export function serieTmdb(sobrescrever: Record<string, unknown> = {}) {
  return {
    id: 1399,
    name: "A Guerra dos Tronos",
    original_name: "Game of Thrones",
    overview: "Nove famílias nobres lutam pelo controle de Westeros.",
    poster_path: "/tronos.jpg",
    backdrop_path: "/tronos-fundo.jpg",
    genre_ids: [10765, 18],
    first_air_date: "2011-04-17",
    vote_average: 8.5,
    vote_count: 25000,
    popularity: 300.5,
    origin_country: ["US"],
    ...sobrescrever,
  };
}
