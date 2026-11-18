import "server-only";

import { clienteTmdbPadrao, type ClienteTmdb, type Parametros } from "@/lib/tmdb/cliente";
import {
  anoDe,
  elencoDe,
  nuloSe404,
  ondeAssistirDe,
  paraGeneros,
  paraPagina,
  parametrosDescoberta,
  trailerDe,
  validar,
} from "@/lib/tmdb/comum";
import {
  detalhesSerieTmdb,
  generosTmdb,
  serieTmdb,
  type DetalhesSerieTmdb,
  type SerieTmdb,
} from "@/lib/tmdb/esquemas";
import type {
  ClassificacaoBR,
  FiltrosDescobertaSerie,
  OrdemDescoberta,
  Pagina,
  SerieDetalhes,
  SerieResumo,
} from "@/lib/tmdb/tipos";

const HORA = 3600;
const CACHE_LISTAS = 6 * HORA;
const CACHE_SERIE = 24 * HORA;

const ORDENS: Record<OrdemDescoberta, string> = {
  popularidade: "popularity.desc",
  nota: "vote_average.desc",
  lancamento: "first_air_date.desc",
};

const CLASSIFICACOES: readonly ClassificacaoBR[] = ["L", "10", "12", "14", "16", "18"];

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

/** Média de `episode_run_time`; sem ela, a duração do último episódio exibido. */
function duracaoEpisodio(serie: DetalhesSerieTmdb): number | null {
  const duracoes = serie.episode_run_time.filter((minutos) => minutos > 0);
  if (duracoes.length === 0) return serie.last_episode_to_air?.runtime || null;
  return Math.round(duracoes.reduce((soma, minutos) => soma + minutos, 0) / duracoes.length);
}

function classificacaoDe(serie: DetalhesSerieTmdb): ClassificacaoBR | null {
  const doBrasil = serie.content_ratings.results.find((r) => r.iso_3166_1 === "BR")?.rating;
  return CLASSIFICACOES.find((classificacao) => classificacao === doBrasil) ?? null;
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
    classificacao: classificacaoDe(serie),
    ondeAssistir: ondeAssistirDe(serie["watch/providers"]),
  };
}

/** Funções de séries sobre um cliente qualquer; os testes passam um cliente com `fetch` falso. */
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

    obterSerie(id: number): Promise<SerieDetalhes | null> {
      return nuloSe404(async () => {
        const dados = await cliente.requisitar(
          `/tv/${id}`,
          { append_to_response: "videos,credits,watch/providers,content_ratings" },
          CACHE_SERIE,
        );
        return paraDetalhes(validar(detalhesSerieTmdb, dados));
      });
    },

    /** Gêneros de TV: outra lista que a dos filmes, com IDs próprios. */
    async generosSeries(): Promise<{ id: number; nome: string }[]> {
      const dados = await cliente.requisitar("/genre/tv/list", {}, CACHE_SERIE);
      return paraGeneros(validar(generosTmdb, dados).genres);
    },
  };
}

export type ApiSeries = ReturnType<typeof criarApiSeries>;

let padrao: ApiSeries | undefined;
const api = () => (padrao ??= criarApiSeries(clienteTmdbPadrao()));

export const descobrirSeries: ApiSeries["descobrirSeries"] = (...args) =>
  api().descobrirSeries(...args);
export const obterSerie: ApiSeries["obterSerie"] = (...args) => api().obterSerie(...args);
export const generosSeries: ApiSeries["generosSeries"] = () => api().generosSeries();
