import "server-only";

import { CACHE_CLASSIFICACAO, classificacaoDaSerie } from "@/lib/tmdb/classificacao";
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
import {
  classificacoesSerieTmdb,
  detalhesSerieTmdb,
  generosTmdb,
  serieTmdb,
  temporadaTmdb,
  type DetalhesSerieTmdb,
  type SerieTmdb,
  type TemporadaTmdb,
} from "@/lib/tmdb/esquemas";
import type {
  ClassificacaoBR,
  FiltrosDescobertaSerie,
  OrdemDescoberta,
  Pagina,
  SerieDetalhes,
  SerieResumo,
  TemporadaDetalhes,
} from "@/lib/tmdb/tipos";

const HORA = 3600;
const CACHE_LISTAS = 6 * HORA;
const CACHE_SERIE = 24 * HORA;

const PAGINA_VAZIA: Pagina<never> = { itens: [], pagina: 1, totalPaginas: 0, totalResultados: 0 };

const ORDENS: Record<OrdemDescoberta, string> = {
  popularidade: "popularity.desc",
  nota: "vote_average.desc",
  lancamento: "first_air_date.desc",
};

function paraResumo(serie: SerieTmdb): SerieResumo {
  return {
    id: serie.id,
    titulo: serie.name,
    tituloOriginal: serie.original_name,
    sinopse: serie.overview,
    posterPath: serie.poster_path,
    backdropPath: serie.backdrop_path,
    generos: serie.genre_ids,
    ano: anoDe(serie.first_air_date),
    nota: serie.vote_average,
    votos: serie.vote_count,
    popularidade: serie.popularity,
  };
}

/** MÃ©dia de `episode_run_time`; sem ela, a duraÃ§Ã£o do Ãºltimo episÃ³dio exibido. */
function duracaoEpisodio(serie: DetalhesSerieTmdb): number | null {
  const duracoes = serie.episode_run_time.filter((minutos) => minutos > 0);
  if (duracoes.length === 0) return serie.last_episode_to_air?.runtime || null;
  return Math.round(duracoes.reduce((soma, minutos) => soma + minutos, 0) / duracoes.length);
}

function paraDetalhes(serie: DetalhesSerieTmdb): SerieDetalhes {
  return {
    ...paraResumo({ ...serie, genre_ids: [] }),
    generos: paraGeneros(serie.genres),
    duracaoEpisodioMin: duracaoEpisodio(serie),
    temporadas: serie.seasons
      .filter((temporada) => temporada.season_number > 0)
      .sort((a, b) => a.season_number - b.season_number)
      .map((temporada) => ({
        numero: temporada.season_number,
        nome: temporada.name,
        episodios: temporada.episode_count,
        ano: anoDe(temporada.air_date),
        posterPath: temporada.poster_path,
      })),
    slogan: serie.tagline,
    trailerYoutube: trailerDe(serie.videos.results),
    elenco: elencoDe(serie.credits),
    criacao: serie.created_by.map((pessoa) => pessoa.name),
    classificacao: classificacaoDaSerie(serie.content_ratings.results),
    ondeAssistir: ondeAssistirDe(serie["watch/providers"]),
    situacao: serie.status,
    proximoEpisodio: serie.next_episode_to_air?.air_date ?? null,
    proximoEpisodioDetalhes: serie.next_episode_to_air
      ? {
          id: serie.next_episode_to_air.id ?? null,
          nome: serie.next_episode_to_air.name,
          temporadaNumero: serie.next_episode_to_air.season_number ?? null,
          episodioNumero: serie.next_episode_to_air.episode_number ?? null,
          data: serie.next_episode_to_air.air_date,
        }
      : null,
  };
}

function paraTemporada(temporada: TemporadaTmdb): TemporadaDetalhes {
  return {
    numero: temporada.season_number,
    nome: temporada.name,
    sinopse: temporada.overview,
    ano: anoDe(temporada.air_date),
    posterPath: temporada.poster_path,
    episodios: temporada.episodes.map((episodio) => ({
      numero: episodio.episode_number,
      nome: episodio.name,
      sinopse: episodio.overview,
      duracaoMin: episodio.runtime || null,
      data: episodio.air_date,
      stillPath: episodio.still_path,
      nota: episodio.vote_count > 0 ? episodio.vote_average : null,
    })),
  };
}

/** FunÃ§Ãµes de sÃ©ries sobre um cliente qualquer; os testes passam um cliente com `fetch` falso. */
export function criarApiSeries(cliente: ClienteTmdb) {
  return {
    async descobrirSeries(filtros: FiltrosDescobertaSerie = {}): Promise<Pagina<SerieResumo>> {
      const parametros: Parametros = {
        ...parametrosDescoberta(filtros, ORDENS),
        first_air_date_year: filtros.ano,
        "first_air_date.lte": filtros.lancadoAte,
      };
      const dados = await cliente.requisitar("/discover/tv", parametros, CACHE_LISTAS);
      return paraPagina(serieTmdb, dados, paraResumo);
    },

    obterSerie(id: number, semCache = false): Promise<SerieDetalhes | null> {
      return nuloSe404(async () => {
        const dados = await cliente.requisitar(
          `/tv/${id}`,
          { append_to_response: "videos,credits,watch/providers,content_ratings" },
          semCache ? 0 : CACHE_SERIE,
        );
        return paraDetalhes(validar(detalhesSerieTmdb, dados));
      });
    },

    /** Temporada `numero` com os episÃ³dios; `null` se a sÃ©rie ou a temporada nÃ£o existem. */
    obterTemporada(serieId: number, numero: number): Promise<TemporadaDetalhes | null> {
      return nuloSe404(async () => {
        const dados = await cliente.requisitar(`/tv/${serieId}/season/${numero}`, {}, CACHE_SERIE);
        return paraTemporada(validar(temporadaTmdb, dados));
      });
    },

    /** SÃ³ a classificaÃ§Ã£o (`/tv/{id}/content_ratings`); lanÃ§a se o TMDB falhar. */
    async classificacaoSerie(id: number): Promise<ClassificacaoBR | null> {
      const dados = await cliente.requisitar(`/tv/${id}/content_ratings`, {}, CACHE_CLASSIFICACAO);
      return classificacaoDaSerie(validar(classificacoesSerieTmdb, dados).results);
    },

    /** GÃªneros de TV: outra lista que a dos filmes, com IDs prÃ³prios. */
    async generosSeries(): Promise<{ id: number; nome: string }[]> {
      const dados = await cliente.requisitar("/genre/tv/list", {}, CACHE_SERIE);
      return paraGeneros(validar(generosTmdb, dados).genres);
    },

    /** Busca por nome (`/search/tv`), sem `region`: a busca de sÃ©ries nÃ£o filtra por paÃ­s. */
    async buscarSeries(texto: string, pagina = 1): Promise<Pagina<SerieResumo>> {
      const consulta = texto.trim();
      if (!consulta) return PAGINA_VAZIA;
      const dados = await cliente.requisitar(
        "/search/tv",
        { query: consulta, page: limitarPagina(pagina), include_adult: false },
        CACHE_LISTAS,
      );
      return paraPagina(serieTmdb, dados, paraResumo);
    },
  };
}

export type ApiSeries = ReturnType<typeof criarApiSeries>;

let padrao: ApiSeries | undefined;
const api = () => (padrao ??= criarApiSeries(clienteTmdbPadrao()));

export const descobrirSeries: ApiSeries["descobrirSeries"] = (...args) =>
  api().descobrirSeries(...args);
export const obterSerie: ApiSeries["obterSerie"] = (...args) => api().obterSerie(...args);
export const obterTemporada: ApiSeries["obterTemporada"] = (...args) =>
  api().obterTemporada(...args);
export const generosSeries: ApiSeries["generosSeries"] = () => api().generosSeries();
export const buscarSeries: ApiSeries["buscarSeries"] = (...args) => api().buscarSeries(...args);
export const classificacaoSerie: ApiSeries["classificacaoSerie"] = (...args) =>
  api().classificacaoSerie(...args);


