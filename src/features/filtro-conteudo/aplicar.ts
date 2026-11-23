import type { FiltroConteudo } from "@/features/filtro-conteudo/opcoes";
import { bloqueado } from "@/features/filtro-conteudo/regras";
import type { Midia } from "@/lib/midia";
import type { ClassificacaoBR } from "@/lib/tmdb/tipos";

/** Classificação de um título; lança quando não dá para saber (TMDB fora do ar). */
export type Classificar = (midia: Midia) => Promise<ClassificacaoBR | null>;

/** Consultas ao TMDB ao mesmo tempo, no máximo. */
export const CONSULTAS_SIMULTANEAS = 8;

/**
 * Tira da lista os títulos bloqueados pelo filtro (+18). Sem filtro, devolve a lista sem
 * consultar nada. Com filtro, consulta a classificação de cada título, no máximo
 * `CONSULTAS_SIMULTANEAS` por vez; **se a consulta falhar, o título sai** (na dúvida, não
 * aparece). A ordem é mantida.
 */
export async function semBloqueados<T>(
  itens: readonly T[],
  filtro: FiltroConteudo,
  midiaDe: (item: T) => Midia,
  classificar: Classificar,
): Promise<T[]> {
  if (!filtro || itens.length === 0) return [...itens];

  const mantem = new Array<boolean>(itens.length).fill(false);
  let proximo = 0;
  let falhas = 0;

  async function trabalhar() {
    while (proximo < itens.length) {
      const indice = proximo++;
      try {
        mantem[indice] = !bloqueado(await classificar(midiaDe(itens[indice]!)), filtro);
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
