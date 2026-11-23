import type { ClassificacaoBR } from "@/lib/tmdb/tipos";

/** Classificações do Brasil, da mais leve à mais restrita. Pode ser usado no navegador. */
export const CLASSIFICACOES_BR: readonly ClassificacaoBR[] = ["L", "10", "12", "14", "16", "18"];

/** Classificação conhecida e até `maxima`; desconhecida (`null`) não passa. */
export function ateAClassificacao(
  classificacao: ClassificacaoBR | null | undefined,
  maxima: ClassificacaoBR,
): boolean {
  return (
    !!classificacao && CLASSIFICACOES_BR.indexOf(classificacao) <= CLASSIFICACOES_BR.indexOf(maxima)
  );
}
