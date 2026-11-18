/**
 * "23h40": hora em que o filme termina se começar em `inicio`, no fuso de quem chama.
 * Use no navegador, para valer o fuso da pessoa (o servidor roda em UTC).
 */
export function terminaAs(inicio: Date, duracaoMin: number): string {
  const fim = new Date(inicio.getTime() + duracaoMin * 60_000);
  return `${fim.getHours()}h${String(fim.getMinutes()).padStart(2, "0")}`;
}
