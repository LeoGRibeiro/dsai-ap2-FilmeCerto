import type { Frequencia } from "@/features/preferencias/opcoes";
import { motivoPorGeneros } from "@/features/recomendacao/motivo";
import { PERFIS } from "@/features/recomendacao/perfil";
import type { Recomendacao, Secao } from "@/features/recomendacao/tipos";
import { generosEmTv, TV } from "@/features/serie/generos";
import { descobrirSeries, generosSeries, type ApiSeries } from "@/lib/tmdb/series";
import type { FiltrosDescobertaSerie } from "@/lib/tmdb/tipos";

export type ApiSecaoSeries = Pick<ApiSeries, "descobrirSeries" | "generosSeries">;

export type EntradaSecaoSeries = {
  /** Gêneros de filme do perfil: viram gêneros de TV aqui. */
  preferencias: { generos: number[]; generosEvitados?: number[]; frequencia: Frequencia };
  /** Cada "Gerar outras recomendações" soma 1 e troca a página do TMDB. */
  rodada: number;
  /** IDs de séries com reação ou numa lista: não voltam na seção. */
  excluir: number[];
};

const API_PADRAO: ApiSecaoSeries = { descobrirSeries, generosSeries };

export const TITULO_SECAO_SERIES = "Séries para hoje à noite";
const MAX_SERIES = 12;
/** Com menos que isso, a seção não aparece: um carrossel quase vazio não ajuda a decidir. */
const MIN_SERIES = 4;
/** Duração máxima do episódio: "um episódio de alguma coisa" (pedido, 3.5). */
const EPISODIO_MAX_MIN = 60;
/** Nunca entram. Kids sai porque o dashboard não sabe se há criança na sala. */
const SEMPRE_FORA = [TV.news, TV.reality, TV.talk, TV.kids];

/** Filtros do `/discover/tv` da seção (tabela em SPEC/2026-11-19-series-descoberta.md). */
export function filtrosSecaoSeries({
  preferencias,
  rodada,
}: Pick<EntradaSecaoSeries, "preferencias" | "rodada">): FiltrosDescobertaSerie {
  const perfil = PERFIS[preferencias.frequencia];
  const favoritos = generosEmTv(preferencias.generos);
  const evitados = generosEmTv(preferencias.generosEvitados ?? []);
  return {
    // Sem favorito com equivalente em TV, sem filtro de gênero.
    generos: favoritos.length > 0 ? favoritos : undefined,
    semGeneros: [...new Set([...evitados, ...SEMPRE_FORA])],
    duracaoMax: EPISODIO_MAX_MIN,
    votosMin: perfil.votosMin,
    notaMin: perfil.notaMin,
    ordem: "popularidade",
    pagina: (rodada % perfil.paginaMax) + 1,
  };
}

/**
 * Seção "Séries para hoje à noite" do dashboard, com séries dos gêneros favoritos.
 * `null` quando sobram menos de 4 séries; TMDB fora do ar, a seção com `erro`.
 */
export async function montarSecaoSeries(
  entrada: EntradaSecaoSeries,
  api: ApiSecaoSeries = API_PADRAO,
): Promise<Secao | null> {
  const base = { id: "series", titulo: TITULO_SECAO_SERIES };
  let resultado: Awaited<ReturnType<ApiSecaoSeries["descobrirSeries"]>>;
  let generosTv: { id: number; nome: string }[];
  try {
    [resultado, generosTv] = await Promise.all([
      api.descobrirSeries(filtrosSecaoSeries(entrada)),
      api.generosSeries(),
    ]);
  } catch (erro) {
    console.error("[series] seção do dashboard falhou:", erro);
    return { ...base, filmes: [], erro: true };
  }

  const fora = new Set(entrada.excluir);
  const favoritos = generosEmTv(entrada.preferencias.generos);
  const series: Recomendacao[] = resultado.itens
    .filter((serie) => !fora.has(serie.id))
    .slice(0, MAX_SERIES)
    .map((serie) => ({
      ...serie,
      tipo: "serie",
      motivo: motivoPorGeneros(serie.generos, favoritos, generosTv),
      // A ordem já vem do TMDB, por popularidade.
      pontuacao: serie.popularidade,
    }));
  return series.length < MIN_SERIES ? null : { ...base, filmes: series };
}
