import "server-only";

import { clienteTmdbPadrao, type ClienteTmdb, type Parametros } from "@/lib/tmdb/cliente";
import {
  anoDe,
  elencoDe,
  limitarPagina,
  nuloSe404,
  ondeAssistirDe,
  paraGeneros,
  paraPagina,
  parametrosDescoberta,
  trailerDe,
  validar,
} from "@/lib/tmdb/comum";
import { CACHE_CLASSIFICACAO, classificacaoDoFilme, temasDoFilme } from "@/lib/tmdb/classificacao";
import {
  datasLancamentoTmdb,
  detalhesTmdb,
  filmeTmdb,
  type DetalhesTmdb,
  type FilmeTmdb,
} from "@/lib/tmdb/esquemas";
import type {
  ClassificacaoBR,
  FilmeDetalhes,
  FilmeResumo,
  FiltrosDescoberta,
  OrdemDescoberta,
  Pagina,
} from "@/lib/tmdb/tipos";

const HORA = 3600;
const CACHE_LISTAS = 6 * HORA;
const CACHE_FILME = 24 * HORA;

const ORDENS: Record<OrdemDescoberta, string> = {
  popularidade: "popularity.desc",
  nota: "vote_average.desc",
  lancamento: "primary_release_date.desc",
};

const PAGINA_VAZIA: Pagina<never> = { itens: [], pagina: 1, totalPaginas: 0, totalResultados: 0 };

function paraResumo(filme: FilmeTmdb): FilmeResumo {
  return {
    id: filme.id,
    titulo: filme.title,
    tituloOriginal: filme.original_title,
    sinopse: filme.overview,
    posterPath: filme.poster_path,
    backdropPath: filme.backdrop_path,
    generos: filme.genre_ids,
    ano: anoDe(filme.release_date),
    nota: filme.vote_average,
    votos: filme.vote_count,
    popularidade: filme.popularity,
  };
}

function paraDetalhes(filme: DetalhesTmdb): FilmeDetalhes {
  return {
    ...paraResumo({ ...filme, genre_ids: [] }),
    generos: paraGeneros(filme.genres),
    duracaoMin: filme.runtime || null,
    slogan: filme.tagline,
    trailerYoutube: trailerDe(filme.videos.results),
    elenco: elencoDe(filme.credits),
    direcao: filme.credits.crew.filter((p) => p.job === "Director").map((p) => p.name),
    ondeAssistir: ondeAssistirDe(filme["watch/providers"]),
    parecidos: (filme.recommendations?.results ?? []).map(paraResumo),
    classificacao: classificacaoDoFilme(filme.release_dates.results),
    temas: temasDoFilme(filme.release_dates.results),
  };
}

/** Funções de filmes sobre um cliente qualquer; os testes passam um cliente com `fetch` falso. */
export function criarApiFilmes(cliente: ClienteTmdb) {
  return {
    async descobrirFilmes(filtros: FiltrosDescoberta = {}): Promise<Pagina<FilmeResumo>> {
      const parametros: Parametros = {
        ...parametrosDescoberta(filtros, ORDENS),
        primary_release_year: filtros.ano,
        "primary_release_date.lte": filtros.lancadoAte,
        certification_country: filtros.classificacaoMax && "BR",
        "certification.lte": filtros.classificacaoMax,
        region: "BR",
      };
      const dados = await cliente.requisitar("/discover/movie", parametros, CACHE_LISTAS);
      return paraPagina(filmeTmdb, dados, paraResumo);
    },

    obterFilme(id: number): Promise<FilmeDetalhes | null> {
      return nuloSe404(async () => {
        const dados = await cliente.requisitar(
          `/movie/${id}`,
          { append_to_response: "videos,credits,watch/providers,recommendations,release_dates" },
          CACHE_FILME,
        );
        return paraDetalhes(validar(detalhesTmdb, dados));
      });
    },

    /**
     * Só a classificação (`/movie/{id}/release_dates`), para tirar o +18 de uma lista. Lança se
     * o TMDB falhar ou o filme não existir: quem chama decide o que fazer na dúvida.
     */
    async classificacaoFilme(id: number): Promise<ClassificacaoBR | null> {
      const dados = await cliente.requisitar(`/movie/${id}/release_dates`, {}, CACHE_CLASSIFICACAO);
      return classificacaoDoFilme(validar(datasLancamentoTmdb, dados).results);
    },

    async recomendacoesDe(id: number, pagina = 1): Promise<Pagina<FilmeResumo>> {
      const dados = await cliente.requisitar(
        `/movie/${id}/recommendations`,
        { page: limitarPagina(pagina) },
        CACHE_FILME,
      );
      return paraPagina(filmeTmdb, dados, paraResumo);
    },

    async buscarFilmes(texto: string, pagina = 1): Promise<Pagina<FilmeResumo>> {
      const consulta = texto.trim();
      if (!consulta) return PAGINA_VAZIA;
      const dados = await cliente.requisitar(
        "/search/movie",
        { query: consulta, page: limitarPagina(pagina), region: "BR", include_adult: false },
        CACHE_LISTAS,
      );
      return paraPagina(filmeTmdb, dados, paraResumo);
    },
  };
}

export type ApiFilmes = ReturnType<typeof criarApiFilmes>;

let padrao: ApiFilmes | undefined;
const api = () => (padrao ??= criarApiFilmes(clienteTmdbPadrao()));

export const descobrirFilmes: ApiFilmes["descobrirFilmes"] = (...args) =>
  api().descobrirFilmes(...args);
export const obterFilme: ApiFilmes["obterFilme"] = (...args) => api().obterFilme(...args);
export const recomendacoesDe: ApiFilmes["recomendacoesDe"] = (...args) =>
  api().recomendacoesDe(...args);
export const classificacaoFilme: ApiFilmes["classificacaoFilme"] = (...args) =>
  api().classificacaoFilme(...args);
export const buscarFilmes: ApiFilmes["buscarFilmes"] = (...args) => api().buscarFilmes(...args);
