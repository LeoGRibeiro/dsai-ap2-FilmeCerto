import { NOMES_PAIS_TEMAS, ROTULOS_TEMA, type TemasClassificacao } from "@/lib/tmdb/classificacao";

/** "violência, medo" */
export function listaDeTemas({ temas }: TemasClassificacao): string {
  return temas.map((tema) => ROTULOS_TEMA[tema]).join(", ");
}

/** De onde vêm os temas, quando não é do Brasil: "segundo a classificação da Holanda". */
export function origemDosTemas({ pais }: TemasClassificacao): string | null {
  return pais === "BR" ? null : `segundo a classificação ${NOMES_PAIS_TEMAS[pais]}`;
}
