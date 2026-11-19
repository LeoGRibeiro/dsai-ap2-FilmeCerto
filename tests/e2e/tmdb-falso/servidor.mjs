// TMDB falso para os testes E2E: respostas determinísticas, sem rede e sem pôsteres.
// Uso: node tests/e2e/tmdb-falso/servidor.mjs [porta]   (padrão 4010)
import { createServer } from "node:http";

const PORTA = Number(process.argv[2] ?? process.env.TMDB_FALSO_PORTA ?? 4010);
const GENERO_QUE_FALHA = "99"; // Documentário: sempre 503, para testar seção com erro.

const NOMES = {
  28: "Ação",
  16: "Animação",
  12: "Aventura",
  10770: "Cinema TV",
  35: "Comédia",
  80: "Crime",
  99: "Documentário",
  18: "Drama",
  10751: "Família",
  14: "Fantasia",
  37: "Faroeste",
  878: "Ficção científica",
  10752: "Guerra",
  36: "História",
  9648: "Mistério",
  10402: "Música",
  10749: "Romance",
  27: "Terror",
  53: "Thriller",
};

function filme(id, titulo, genero, posicao) {
  return {
    id,
    title: titulo,
    original_title: titulo,
    overview: `Sinopse de ${titulo}.`,
    // Pôster só nos IDs pares: o globo do "Me surpreenda" descarta filmes sem pôster.
    poster_path: id % 2 === 0 ? `/falso-${id}.jpg` : null,
    backdrop_path: null,
    genre_ids: [genero],
    release_date: `${2000 + (id % 25)}-01-01`,
    vote_average: 6 + ((id * 7) % 40) / 10,
    vote_count: 500 + posicao * 10,
    popularity: 100 - posicao * 3,
    adult: false,
  };
}

// Gêneros de TV: outra lista que a dos filmes (/genre/tv/list), com IDs próprios.
const NOMES_TV = {
  10759: "Action & Adventure",
  16: "Animação",
  35: "Comédia",
  80: "Crime",
  99: "Documentário",
  18: "Drama",
  10751: "Família",
  10762: "Kids",
  9648: "Mistério",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  37: "Faroeste",
};

/** Série com os mesmos valores de um filme: na série, o título é `name` e a data, a estreia. */
function serie(id, titulo, genero, posicao) {
  const { title, original_title, release_date, ...resto } = filme(id, titulo, genero, posicao);
  return { ...resto, name: title, original_name: original_title, first_air_date: release_date };
}

const ELENCO = [
  { name: "Atriz Um", character: "Heroína", profile_path: null },
  { name: "Ator Dois", character: "Vilão", profile_path: null },
  { name: "Atriz Três", character: "Mentora", profile_path: null },
];

/** Vídeos e onde assistir dos detalhes; `tipo` é "movie" ou "tv", como nos links do TMDB. */
function anexos(tipo, id, trailer) {
  return {
    videos: { results: [{ key: trailer, site: "YouTube", type: "Trailer", official: true }] },
    "watch/providers": {
      results: {
        BR: {
          link: `https://www.themoviedb.org/${tipo}/${id}/watch?locale=BR`,
          flatrate: [{ provider_id: 8, provider_name: "Netflix", logo_path: null }],
          rent: [{ provider_id: 2, provider_name: "Apple TV", logo_path: null }],
        },
      },
    },
  };
}

function pagina(resultados, numero) {
  return { page: numero, results: resultados, total_pages: 50, total_results: 1000 };
}

/** Gênero pedido em with_genres; sem ele, o primeiro de `nomes` fora de without_genres. */
function generoPedido(url, nomes) {
  const sem = (url.searchParams.get("without_genres") ?? "").split(",").filter(Boolean);
  const padrao = Object.keys(nomes).find((id) => !sem.includes(id)) ?? "18";
  return url.searchParams.get("with_genres") ?? padrao;
}

function responder(res, status, corpo) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(corpo));
}

const servidor = createServer((req, res) => {
  if (!req.headers.authorization?.startsWith("Bearer ")) {
    return responder(res, 401, { status_message: "Sem token" });
  }

  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (url.pathname === "/3/discover/movie") {
    const generos = generoPedido(url, NOMES);
    if (generos === GENERO_QUE_FALHA) return responder(res, 503, { status_message: "Falha" });
    const genero = Number(generos.split(/[|,]/)[0]);
    const numero = Number(url.searchParams.get("page") ?? 1);
    const nome = NOMES[genero] ?? `Gênero ${genero}`;
    // Com with_watch_providers, filmes só desta consulta ("Nos seus streamings").
    const streaming = url.searchParams.has("with_watch_providers");
    // Com certification.lte (wizard em "família"), filmes que só essa consulta devolve.
    const familia = url.searchParams.has("certification.lte");
    // Com with_runtime.lte abaixo de 100 ("Até que horas?" do wizard, "Curtos" da busca),
    // filmes curtos, de 80 min nos detalhes ("Curto {id}"). Os limites de 105 e 110 dos outros
    // testes do wizard continuam no caso geral.
    const curto = Number(url.searchParams.get("with_runtime.lte") ?? Infinity) < 100;
    const filmes = Array.from({ length: 20 }, (_, i) =>
      familia
        ? filme(700000 + numero * 20 + i, `Para a família ${numero}-${i + 1}`, genero, i)
        : curto
          ? filme(600000 + numero * 20 + i, `${nome} curto ${numero}-${i + 1}`, genero, i)
          : streaming
            ? filme(800000 + numero * 20 + i, `No streaming ${numero}-${i + 1}`, genero, i)
            : filme(genero * 1000 + numero * 20 + i, `${nome} ${numero}-${i + 1}`, genero, i),
    );
    return responder(res, 200, pagina(filmes, numero));
  }

  if (url.pathname === "/3/search/movie") {
    const texto = url.searchParams.get("query") ?? "";
    const numero = Number(url.searchParams.get("page") ?? 1);
    if (texto.includes("nada")) {
      return responder(res, 200, { page: 1, results: [], total_pages: 0, total_results: 0 });
    }
    const filmes = Array.from({ length: 20 }, (_, i) =>
      filme(500000 + numero * 20 + i, `${texto} ${numero}-${i + 1}`, 878, i),
    );
    return responder(res, 200, {
      page: numero,
      results: filmes,
      total_pages: 3,
      total_results: 55,
    });
  }

  const detalhes = url.pathname.match(/^\/3\/movie\/(\d+)$/);
  if (detalhes) {
    const id = Number(detalhes[1]);
    if (id >= 999000000) return responder(res, 404, { status_code: 34 });
    // Os filmes "Para a família" (IDs 700000+, só com certification.lte) mantêm o nome nos
    // detalhes, que é o que o resultado do wizard mostra.
    const familia = id >= 700000 && id < 800000;
    const curto = id >= 600000 && id < 700000;
    const titulo = familia ? `Para a família ${id}` : curto ? `Curto ${id}` : `Filme ${id}`;
    const base = filme(id, titulo, 18, 0);
    delete base.genre_ids;
    return responder(res, 200, {
      ...base,
      overview: `Sinopse do Filme ${id}.`,
      genres: [
        { id: 18, name: "Drama" },
        { id: 28, name: "Ação" },
      ],
      runtime: curto ? 80 : 125,
      tagline: "Um slogan de teste.",
      ...anexos("movie", id, "trailer-falso"),
      credits: { cast: ELENCO, crew: [{ name: "Diretora Teste", job: "Director" }] },
      recommendations: pagina(
        Array.from({ length: 5 }, (_, i) => filme(id * 10 + i, `Parecido ${id}-${i + 1}`, 18, i)),
        1,
      ),
    });
  }

  const recomendacoes = url.pathname.match(/^\/3\/movie\/(\d+)\/recommendations$/);
  if (recomendacoes) {
    const origem = Number(recomendacoes[1]);
    const filmes = Array.from({ length: 10 }, (_, i) =>
      filme(origem * 100 + i, `Parecido ${origem}-${i + 1}`, 18, i),
    );
    return responder(res, 200, pagina(filmes, 1));
  }

  if (url.pathname === "/3/genre/tv/list") {
    const genres = Object.entries(NOMES_TV).map(([id, name]) => ({ id: Number(id), name }));
    return responder(res, 200, { genres });
  }

  if (url.pathname === "/3/discover/tv") {
    const genero = Number(generoPedido(url, NOMES_TV).split(/[|,]/)[0]);
    const numero = Number(url.searchParams.get("page") ?? 1);
    const nome = NOMES_TV[genero] ?? `Gênero ${genero}`;
    const streaming = url.searchParams.has("with_watch_providers");
    // Mesma fórmula de IDs dos filmes: o mesmo ID é um filme e uma série diferentes, como no TMDB.
    const series = Array.from({ length: 20 }, (_, i) =>
      streaming
        ? serie(800000 + numero * 20 + i, `Série no streaming ${numero}-${i + 1}`, genero, i)
        : serie(genero * 1000 + numero * 20 + i, `Série ${nome} ${numero}-${i + 1}`, genero, i),
    );
    return responder(res, 200, pagina(series, numero));
  }

  const detalhesSerie = url.pathname.match(/^\/3\/tv\/(\d+)$/);
  if (detalhesSerie) {
    const id = Number(detalhesSerie[1]);
    if (id >= 999000000) return responder(res, 404, { status_code: 34 });
    const base = serie(id, `Série ${id}`, 18, 0);
    delete base.genre_ids;
    return responder(res, 200, {
      ...base,
      overview: `Sinopse da Série ${id}.`,
      genres: [
        { id: 18, name: "Drama" },
        { id: 10765, name: "Sci-Fi & Fantasy" },
      ],
      episode_run_time: [45],
      last_episode_to_air: { runtime: 47 },
      seasons: [
        {
          season_number: 0,
          name: "Especiais",
          episode_count: 2,
          air_date: null,
          poster_path: null,
        },
        {
          season_number: 1,
          name: "Temporada 1",
          episode_count: 10,
          air_date: "2019-03-01",
          poster_path: null,
        },
        {
          season_number: 2,
          name: "Temporada 2",
          episode_count: 8,
          air_date: "2021-03-01",
          poster_path: null,
        },
      ],
      tagline: "Um slogan de série.",
      created_by: [{ name: "Criadora Teste" }],
      ...anexos("tv", id, "trailer-serie-falso"),
      credits: { cast: ELENCO, crew: [] },
      content_ratings: { results: [{ iso_3166_1: "BR", rating: "12" }] },
    });
  }

  responder(res, 404, { status_message: "Não encontrado" });
});

servidor.listen(PORTA, "127.0.0.1", () => {
  console.log(`TMDB falso em http://127.0.0.1:${PORTA}/3`);
});
