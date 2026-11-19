/**
 * "23h40": hora em que o filme termina se começar em `inicio`, no fuso de quem chama.
 * Use no navegador, para valer o fuso da pessoa (o servidor roda em UTC).
 */
export function terminaAs(inicio: Date, duracaoMin: number): string {
  const fim = new Date(inicio.getTime() + duracaoMin * 60_000);
  return `${fim.getHours()}h${String(fim.getMinutes()).padStart(2, "0")}`;
}

const DIA_MIN = 24 * 60;
/** Uma hora que ficou até 6 h para trás "já passou"; mais que isso, é a de hoje à noite. */
const PASSOU_HA_ATE_MIN = 6 * 60;

/**
 * Minutos de `agora` até o relógio marcar `hora` (0 a 23), atravessando a meia-noite
 * (23h30 até 1h = 90). Devolve 0 quando a hora já passou há menos de 6 h ou é agora.
 * Como `terminaAs`, use no navegador: vale o relógio e o fuso da pessoa.
 */
export function minutosAte(hora: number, agora: Date): number {
  const agoraMin = agora.getHours() * 60 + agora.getMinutes();
  const faltam = (hora * 60 - agoraMin + DIA_MIN) % DIA_MIN;
  return faltam > DIA_MIN - PASSOU_HA_ATE_MIN ? 0 : faltam;
}
