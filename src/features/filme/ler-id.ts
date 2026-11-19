/** Só inteiros positivos de até 10 dígitos são IDs válidos do TMDB. */
export function lerId(valor: string): number | null {
  if (!/^\d{1,10}$/.test(valor)) return null;
  const id = Number(valor);
  return id > 0 ? id : null;
}
