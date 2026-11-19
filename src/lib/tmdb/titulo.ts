import "server-only";

import type { TipoMidia } from "@/lib/midia";
import { obterFilme } from "@/lib/tmdb/filmes";
import { obterSerie } from "@/lib/tmdb/series";
import type { FilmeDetalhes } from "@/lib/tmdb/tipos";

/** O que as reações e as listas guardam de um título; filme e série têm esses campos. */
export type DadosTitulo = Pick<FilmeDetalhes, "titulo" | "posterPath" | "ano" | "generos">;

export type BuscarTitulo = (id: number) => Promise<DadosTitulo | null>;

const BUSCAR: Record<TipoMidia, BuscarTitulo> = { filme: obterFilme, serie: obterSerie };

/** Busca no TMDB do jeito certo para o tipo: `/movie/{id}` ou `/tv/{id}`. */
export function buscarTitulo(tipo: TipoMidia): BuscarTitulo {
  return BUSCAR[tipo];
}
