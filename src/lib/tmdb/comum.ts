import "server-only";

import type { z } from "zod";

import { TmdbErro, type Parametros } from "@/lib/tmdb/cliente";
import {
  paginaTmdb,
  type CreditosTmdb,
  type GeneroTmdb,
  type OndeAssistirTmdb,
  type VideosTmdb,
} from "@/lib/tmdb/esquemas";
import type {
  FiltrosDescoberta,
  MembroElenco,
  OndeAssistir,
  OrdemDescoberta,
  Pagina,
  Provedor,
} from "@/lib/tmdb/tipos";

// O que filmes e séries convertem do mesmo jeito (SPEC/2026-11-18-series-base.md).

const MAX_ELENCO = 10;
const MAX_PAGINA = 500;

export function validar<T extends z.ZodType>(esquema: T, dados: unknown): z.infer<T> {
  const resultado = esquema.safeParse(dados);
  if (!resultado.success) throw new TmdbErro("Resposta inesperada do TMDB", null);
  return resultado.data;
}

/** Devolve `null` quando o TMDB responde 404; os outros erros seguem. */
export async function nuloSe404<T>(buscar: () => Promise<T>): Promise<T | null> {
  try {
    return await buscar();
  } catch (erro) {
    if (erro instanceof TmdbErro && erro.status === 404) return null;
    throw erro;
  }
}

export function limitarPagina(pagina = 1) {
  return Math.min(Math.max(Math.trunc(pagina), 1), MAX_PAGINA);
}

export function anoDe(data: string | null): number | null {
  const ano = Number(data?.slice(0, 4));
  return ano > 0 ? ano : null;
}

/** Valida uma página de resultados do TMDB e converte cada item. */
export function paraPagina<T extends z.ZodType, R>(
  item: T,
  dados: unknown,
  converter: (item: z.infer<T>) => R,
): Pagina<R> {
  const pagina = validar(paginaTmdb(item), dados);
  return {
    itens: pagina.results.map(converter),
    pagina: pagina.page,
    totalPaginas: pagina.total_pages,
    totalResultados: pagina.total_results,
  };
}

export function paraGeneros(generos: GeneroTmdb[]): { id: number; nome: string }[] {
  return generos.map(({ id, name }) => ({ id, nome: name }));
}

/** Key do trailer oficial do YouTube; senão, do primeiro trailer do YouTube. */
export function trailerDe(videos: VideosTmdb["results"]): string | null {
  const trailers = videos.filter((video) => video.site === "YouTube" && video.type === "Trailer");
  return (trailers.find((video) => video.official) ?? trailers[0])?.key ?? null;
}

export function elencoDe(creditos: CreditosTmdb): MembroElenco[] {
  return creditos.cast.slice(0, MAX_ELENCO).map((pessoa) => ({
    nome: pessoa.name,
    personagem: pessoa.character,
    fotoPath: pessoa.profile_path,
  }));
}

function paraProvedores(
  lista: { provider_id: number; provider_name: string; logo_path: string | null }[],
): Provedor[] {
  return lista.map((p) => ({ id: p.provider_id, nome: p.provider_name, logoPath: p.logo_path }));
}

/** Onde assistir no Brasil, ou `null` quando o TMDB não tem dados do BR. */
export function ondeAssistirDe(provedores: OndeAssistirTmdb): OndeAssistir | null {
  const brasil = provedores.results.BR;
  if (!brasil) return null;
  return {
    link: brasil.link,
    assinatura: paraProvedores(brasil.flatrate),
    aluguel: paraProvedores(brasil.rent),
    compra: paraProvedores(brasil.buy),
  };
}

/** `with_genres`: vírgula exige todos os gêneros; barra aceita qualquer um. */
function generosDe({ generos, todosGeneros }: FiltrosDescoberta): string | undefined {
  if (todosGeneros?.length) return todosGeneros.join(",");
  return generos?.length ? generos.join("|") : undefined;
}

/**
 * Parâmetros do `/discover` iguais para filmes e séries. Cada um soma os seus: datas de
 * lançamento ou de estreia, classificação e região.
 */
export function parametrosDescoberta(
  filtros: FiltrosDescoberta,
  ordens: Record<OrdemDescoberta, string>,
): Parametros {
  const provedores = filtros.provedores?.length ? filtros.provedores.join("|") : undefined;
  return {
    with_watch_providers: provedores,
    watch_region: provedores && "BR",
    with_watch_monetization_types: provedores && "flatrate",
    with_genres: generosDe(filtros),
    without_genres: filtros.semGeneros?.length ? filtros.semGeneros.join(",") : undefined,
    "with_runtime.gte": filtros.duracaoMin,
    "with_runtime.lte": filtros.duracaoMax,
    "vote_average.gte": filtros.notaMin,
    "vote_count.gte": filtros.votosMin,
    sort_by: ordens[filtros.ordem ?? "popularidade"],
    page: limitarPagina(filtros.pagina),
    include_adult: false,
  };
}
