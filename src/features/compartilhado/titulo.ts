import "server-only";

import { buscaPorId, lerId } from "@/features/filme/ler-id";
import { TIPOS_MIDIA, type Midia } from "@/lib/midia";
import { obterFilme } from "@/lib/tmdb/filmes";
import { obterSerie } from "@/lib/tmdb/series";
import type { FilmeDetalhes, SerieDetalhes } from "@/lib/tmdb/tipos";

/** O título da página pública, com o tipo para saber qual cabeçalho e qual `next` usar. */
export type Compartilhado =
  { tipo: "filme"; titulo: FilmeDetalhes } | { tipo: "serie"; titulo: SerieDetalhes };

/**
 * `/compartilhado/[tipo]/[id]`: só `filme` e `serie` com um ID válido do TMDB. `null` para o
 * resto, sem ir ao TMDB (SPEC/2026-11-25-compartilhar-publico.md).
 */
export function lerCompartilhado(tipo: string, id: string): Midia | null {
  const tmdbId = lerId(id);
  const tipoMidia = TIPOS_MIDIA.find((valor) => valor === tipo);
  return tmdbId && tipoMidia ? { tipo: tipoMidia, tmdbId } : null;
}

const buscarFilme = buscaPorId(obterFilme);
const buscarSerie = buscaPorId(obterSerie);

/**
 * Busca o título no TMDB, uma vez por renderização (página e metadados), pela mesma
 * `buscaPorId` das páginas logadas. `null` quando a rota é inválida ou o TMDB não conhece o título.
 */
export async function buscarCompartilhado(tipo: string, id: string): Promise<Compartilhado | null> {
  if (tipo === "filme") {
    const filme = await buscarFilme(id);
    return filme && { tipo, titulo: filme };
  }
  if (tipo === "serie") {
    const serie = await buscarSerie(id);
    return serie && { tipo, titulo: serie };
  }
  return null;
}
