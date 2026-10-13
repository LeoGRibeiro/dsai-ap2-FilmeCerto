/** O auth-js põe o id direto no caminho da URL do GoTrue, então só aceitamos um formato seguro. */
export function idAutorizacaoValido(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(id);
}
