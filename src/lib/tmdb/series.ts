import "server-only";

import { clienteTmdbPadrao, type ClienteTmdb, type Parametros } from "@/lib/tmdb/cliente";
import { anoDe, paraGeneros, paraPagina, parametrosDescoberta, validar } from "@/lib/tmdb/comum";
import { generosTmdb, serieTmdb, type SerieTmdb } from "@/lib/tmdb/esquemas";
import type {
  FiltrosDescobertaSerie,
  OrdemDescoberta,
  Pagina,
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
export const generosSeries: ApiSeries["generosSeries"] = () => api().generosSeries();
