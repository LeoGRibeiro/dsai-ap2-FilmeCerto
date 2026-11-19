import { cache } from "react";

/** Só inteiros positivos de até 10 dígitos são IDs válidos do TMDB. */
export function lerId(valor: string): number | null {
  if (!/^\d{1,10}$/.test(valor)) return null;
  const id = Number(valor);
  return id > 0 ? id : null;
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
