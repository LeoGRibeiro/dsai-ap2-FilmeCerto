import "server-only";

import { SecaoRecomendacoes } from "@/features/dashboard/components/secao-recomendacoes";
import { idsNasListas } from "@/features/listas/consultas";
import { obterReacoes } from "@/features/reacoes/consultas";
import { montarSecaoSeries, type EntradaSecaoSeries } from "@/features/serie/secao-series";

type Props = Pick<EntradaSecaoSeries, "preferencias" | "rodada" | "filtro"> & {
  /** URL atual (com a rodada), usada no "Tentar de novo". */
  urlAtual: string;
};

/**
 * "Séries para hoje à noite": fica no próprio Suspense, para as seções de filmes não esperarem
 * o TMDB de séries. Com poucas séries, não aparece.
 */
export async function SecaoSeries({ preferencias, rodada, urlAtual, filtro }: Props) {
  const [reacoes, nasListas] = await Promise.all([
    obterReacoes(undefined, "serie"),
    idsNasListas(undefined, "serie"),
  ]);
  const secao = await montarSecaoSeries({
    preferencias,
    rodada,
    excluir: [...reacoes.map((reacao) => reacao.tmdbId), ...nasListas],
    filtro,
  });
  if (!secao) return null;
  return <SecaoRecomendacoes secao={secao} urlAtual={urlAtual} />;
}
