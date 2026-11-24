import type { FiltroConteudo } from "@/features/filtro-conteudo/opcoes";
import {
  bloqueado,
  foraDasRecomendacoes,
  limiteMaisRestrito,
} from "@/features/filtro-conteudo/regras";
import type { Midia } from "@/lib/midia";
import type { ClassificacaoBR } from "@/lib/tmdb/tipos";

/** Classificação de um título; lança quando não dá para saber (TMDB fora do ar). */
export type Classificar = (midia: Midia) => Promise<ClassificacaoBR | null>;

/** Consultas ao TMDB ao mesmo tempo, no máximo. */
export const CONSULTAS_SIMULTANEAS = 8;

/**
 * Tira da lista os títulos cuja classificação `sai`. Sem filtro, devolve a lista sem consultar
 * nada. Com filtro, consulta a classificação de cada título, no máximo `CONSULTAS_SIMULTANEAS`
 * por vez; **se a consulta falhar, o título sai** (na dúvida, não aparece). A ordem é mantida.
 */
async function filtrarPorClassificacao<T>(
  itens: readonly T[],
  filtro: FiltroConteudo,
  midiaDe: (item: T) => Midia,
  classificar: Classificar,
  sai: (classificacao: ClassificacaoBR | null, filtro: FiltroConteudo) => boolean,
): Promise<T[]> {
  if (!filtro || itens.length === 0) return [...itens];

  const mantem = new Array<boolean>(itens.length).fill(false);
  let proximo = 0;
  let falhas = 0;

  async function trabalhar() {
    while (proximo < itens.length) {
      const indice = proximo++;
      try {
        mantem[indice] = !sai(await classificar(midiaDe(itens[indice]!)), filtro);
      } catch {
        falhas++;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONSULTAS_SIMULTANEAS, itens.length) }, trabalhar),
  );
  if (falhas > 0) {
    console.error(`[filtro-conteudo] ${falhas} classificações falharam; os títulos saíram.`);
  }
  return itens.filter((_, indice) => mantem[indice]);
}

/** Tira os títulos bloqueados pelo filtro (+18): busca por nome, listas e "Como foi?". */
export function semBloqueados<T>(
  itens: readonly T[],
  filtro: FiltroConteudo,
  midiaDe: (item: T) => Midia,
  classificar: Classificar,
): Promise<T[]> {
  return filtrarPorClassificacao(itens, filtro, midiaDe, classificar, bloqueado);
}

/**
 * Tira o que passa do limite das recomendações (o +18 inclusive) e mantém o sem classificação:
 * parecidos e séries do dashboard, que o TMDB não filtra por classificação.
 */
export function soRecomendaveis<T>(
  itens: readonly T[],
  filtro: FiltroConteudo,
  midiaDe: (item: T) => Midia,
  classificar: Classificar,
): Promise<T[]> {
  return filtrarPorClassificacao(itens, filtro, midiaDe, classificar, foraDasRecomendacoes);
}

/**
 * Envolve um `descobrirFilmes`: com `limite`, toda consulta leva `classificacaoMax` de no máximo
 * esse limite (o TMDB tira o que passa dele, e também os filmes sem classificação do Brasil). Um
 * limite menor que já venha nos filtros, como o 12 da família, continua valendo. Sem limite, a
 * função é a mesma.
 */
export function descobrirAte<F extends { classificacaoMax?: ClassificacaoBR }, R>(
  descobrir: (filtros?: F) => Promise<R>,
  limite: ClassificacaoBR | null,
): (filtros?: F) => Promise<R> {
  if (!limite) return descobrir;
  return (filtros) =>
    descobrir({
      ...filtros,
      classificacaoMax: limiteMaisRestrito(filtros?.classificacaoMax, limite)!,
    } as F);
}
