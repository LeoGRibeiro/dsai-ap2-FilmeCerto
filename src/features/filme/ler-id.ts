import { cache } from "react";

/**
 * Só inteiros positivos de até 10 dígitos são IDs válidos do TMDB. `maximo` limita mais, como o
 * número da temporada (1 a 999).
 */
export function lerId(valor: string, maximo = Infinity): number | null {
  if (!/^\d{1,10}$/.test(valor)) return null;
  const id = Number(valor);
  return id > 0 && id <= maximo ? id : null;
}

/**
 * Busca da página `/{tipo}/[id]`: ID inválido vira `null` sem ir ao TMDB. Uma busca por
 * renderização, compartilhada entre a página e o título da aba (`generateMetadata`).
 */
export function buscaPorId<T>(obter: (id: number) => Promise<T | null>) {
  return cache(async (valor: string): Promise<T | null> => {
    const id = lerId(valor);
    return id ? obter(id) : null;
  });
}
