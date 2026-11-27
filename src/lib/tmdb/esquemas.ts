import { z } from "zod";

/** Strings que o TMDB às vezes manda como `null` ou omite. */
const textoOpcional = z
  .string()
  .nullish()
  .transform((valor) => valor || null);

const textoOuVazio = z
  .string()
  .nullish()
  .transform((valor) => valor ?? "");

const numero = z
  .number()
  .nullish()
  .transform((valor) => valor ?? 0);

/** Campos que filme e série têm com o mesmo nome. */
const baseTitulo = {
  id: z.number().int(),
  overview: textoOuVazio,
  poster_path: textoOpcional,
  backdrop_path: textoOpcional,
  vote_average: numero,
  vote_count: numero,
  popularity: numero,
};

const baseFilme = {
  ...baseTitulo,
  title: z.string(),
  original_title: textoOuVazio,
  release_date: textoOpcional,
};

/** Na série, o título é `name` e a data é a da estreia. */
const baseSerie = {
  ...baseTitulo,
  name: z.string(),
  original_name: textoOuVazio,
  first_air_date: textoOpcional,
};

const idsGeneros = z.array(z.number()).default([]);

export const filmeTmdb = z.object({ ...baseFilme, genre_ids: idsGeneros });
export const serieTmdb = z.object({ ...baseSerie, genre_ids: idsGeneros });

export function paginaTmdb<T extends z.ZodType>(item: T) {
  return z.object({
    page: z.number().int(),
    results: z.array(item),
    total_pages: z.number().int(),
    total_results: z.number().int(),
  });
}

const provedorTmdb = z.object({
  provider_id: z.number().int(),
  provider_name: z.string(),
  logo_path: textoOpcional,
});

const generoTmdb = z.object({ id: z.number().int(), name: z.string() });

const videosTmdb = z
  .object({
    results: z.array(
      z.object({
        key: z.string(),
        site: z.string(),
        type: z.string(),
        official: z.boolean().default(false),
      }),
    ),
  })
  .default({ results: [] });

const creditosTmdb = z
  .object({
    cast: z.array(
      z.object({ name: z.string(), character: textoOuVazio, profile_path: textoOpcional }),
    ),
    crew: z.array(z.object({ name: z.string(), job: z.string() })),
  })
  .default({ cast: [], crew: [] });

const ondeAssistirTmdb = z
  .object({
    results: z.record(
      z.string(),
      z.object({
        link: z.string(),
        flatrate: z.array(provedorTmdb).default([]),
        rent: z.array(provedorTmdb).default([]),
        buy: z.array(provedorTmdb).default([]),
      }),
    ),
  })
  .default({ results: {} });

/** Campos que os detalhes de filme e de série têm no mesmo formato. */
const detalhesComuns = {
  genres: z.array(generoTmdb).default([]),
  tagline: textoOpcional,
  videos: videosTmdb,
  credits: creditosTmdb,
  "watch/providers": ondeAssistirTmdb,
};

/** `/movie/{id}/release_dates`: as classificações de cada data de lançamento, por país. */
export const datasLancamentoTmdb = z
  .object({
    results: z.array(
      z.object({
        iso_3166_1: z.string(),
        release_dates: z.array(z.object({ certification: z.string().default("") })).default([]),
      }),
    ),
  })
  .default({ results: [] });

/** `/tv/{id}/content_ratings`: uma classificação por país. */
export const classificacoesSerieTmdb = z
  .object({ results: z.array(z.object({ iso_3166_1: z.string(), rating: z.string() })) })
  .default({ results: [] });

export const detalhesTmdb = z.object({
  ...baseFilme,
  ...detalhesComuns,
  runtime: z.number().nullish(),
  recommendations: paginaTmdb(filmeTmdb).optional(),
  release_dates: datasLancamentoTmdb,
});

/** `last_episode_to_air` e `next_episode_to_air` dos detalhes da série: mesmo formato. */
const episodioSerieTmdb = z
  .object({
    id: z.number().int().nullish(),
    name: textoOpcional,
    season_number: z.number().int().nullish(),
    episode_number: z.number().int().nullish(),
    air_date: textoOpcional,
    runtime: z.number().nullish(),
  })
  .nullish();

export const detalhesSerieTmdb = z.object({
  ...baseSerie,
  ...detalhesComuns,
  /** O TMDB deixou de preencher em muitas séries; vem `[]`. */
  episode_run_time: z.array(z.number()).default([]),
  last_episode_to_air: episodioSerieTmdb,
  /** "Returning Series", "Ended", "Canceled", "In Production", "Planned"... */
  status: textoOpcional,
  next_episode_to_air: episodioSerieTmdb,
  seasons: z
    .array(
      z.object({
        season_number: z.number().int(),
        name: textoOuVazio,
        episode_count: numero,
        air_date: textoOpcional,
        poster_path: textoOpcional,
      }),
    )
    .default([]),
  created_by: z.array(z.object({ name: z.string() })).default([]),
  content_ratings: classificacoesSerieTmdb,
});

export const generosTmdb = z.object({ genres: z.array(generoTmdb) });

/** Uma temporada com os episódios (`/tv/{id}/season/{n}`). */
export const temporadaTmdb = z.object({
  season_number: z.number().int(),
  name: textoOuVazio,
  overview: textoOuVazio,
  air_date: textoOpcional,
  poster_path: textoOpcional,
  episodes: z
    .array(
      z.object({
        episode_number: z.number().int(),
        name: textoOuVazio,
        overview: textoOuVazio,
        runtime: z.number().nullish(),
        air_date: textoOpcional,
        still_path: textoOpcional,
        vote_average: numero,
        vote_count: numero,
      }),
    )
    .default([]),
});

export type FilmeTmdb = z.infer<typeof filmeTmdb>;
export type DetalhesTmdb = z.infer<typeof detalhesTmdb>;
export type SerieTmdb = z.infer<typeof serieTmdb>;
export type DetalhesSerieTmdb = z.infer<typeof detalhesSerieTmdb>;
export type TemporadaTmdb = z.infer<typeof temporadaTmdb>;
export type GeneroTmdb = z.infer<typeof generoTmdb>;
export type VideosTmdb = z.infer<typeof videosTmdb>;
export type CreditosTmdb = z.infer<typeof creditosTmdb>;
export type OndeAssistirTmdb = z.infer<typeof ondeAssistirTmdb>;

