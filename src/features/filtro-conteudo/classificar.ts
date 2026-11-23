import "server-only";

import { semBloqueados } from "@/features/filtro-conteudo/aplicar";
import type { FiltroConteudo } from "@/features/filtro-conteudo/opcoes";
import type { Midia } from "@/lib/midia";
import { classificacaoFilme } from "@/lib/tmdb/filmes";
import { classificacaoSerie } from "@/lib/tmdb/series";

/** Classificação de um filme ou série pelo TMDB (cache de 7 dias). */
export function classificarMidia({ tipo, tmdbId }: Midia) {
  return tipo === "serie" ? classificacaoSerie(tmdbId) : classificacaoFilme(tmdbId);
}

/** `semBloqueados` com o TMDB de verdade; filmes e séries do TMDB (`id`) de um tipo só. */
export function semBloqueadosDoTmdb<T extends { id: number }>(
  itens: readonly T[],
  filtro: FiltroConteudo,
  tipo: Midia["tipo"] = "filme",
): Promise<T[]> {
  return semBloqueados(itens, filtro, (item) => ({ tipo, tmdbId: item.id }), classificarMidia);
}
