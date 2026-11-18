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

export const detalhesTmdb = z.object({
  ...baseFilme,
  ...detalhesComuns,
  runtime: z.number().nullish(),
  recommendations: paginaTmdb(filmeTmdb).optional(),
});

export const detalhesSerieTmdb = z.object({
  ...baseSerie,
  ...detalhesComuns,
  /** O TMDB deixou de preencher em muitas séries; vem `[]`. */
  episode_run_time: z.array(z.number()).default([]),
  last_episode_to_air: z.object({ runtime: z.number().nullish() }).nullish(),
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
  content_ratings: z
    .object({ results: z.array(z.object({ iso_3166_1: z.string(), rating: z.string() })) })
    .default({ results: [] }),
});

export const generosTmdb = z.object({ genres: z.array(generoTmdb) });

export type FilmeTmdb = z.infer<typeof filmeTmdb>;
export type DetalhesTmdb = z.infer<typeof detalhesTmdb>;
export type SerieTmdb = z.infer<typeof serieTmdb>;
export type DetalhesSerieTmdb = z.infer<typeof detalhesSerieTmdb>;
export type GeneroTmdb = z.infer<typeof generoTmdb>;
export type VideosTmdb = z.infer<typeof videosTmdb>;
export type CreditosTmdb = z.infer<typeof creditosTmdb>;
export type OndeAssistirTmdb = z.infer<typeof ondeAssistirTmdb>;
