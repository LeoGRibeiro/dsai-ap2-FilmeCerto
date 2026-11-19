/**
 * "23h40": hora em que o filme termina se começar em `inicio`, no fuso de quem chama.
 * Use no navegador, para valer o fuso da pessoa (o servidor roda em UTC).
 */
export function terminaAs(inicio: Date, duracaoMin: number): string {
  const fim = new Date(inicio.getTime() + duracaoMin * 60_000);
  return `${fim.getHours()}h${String(fim.getMinutes()).padStart(2, "0")}`;
}

export const DIA_MIN = 24 * 60;
/** Uma hora que ficou até 6 h para trás "já passou"; mais que isso, é a de hoje à noite. */
const PASSOU_HA_ATE_MIN = 6 * 60;

/**
 * Minutos de `agora` até o relógio marcar `minutoDoDia` (0 a 1439; 22h15 é 1335), atravessando
 * a meia-noite (23h30 até 1h = 90). Devolve 0 quando o horário já passou há menos de 6 h ou é
 * agora. Como `terminaAs`, use no navegador: vale o relógio e o fuso da pessoa.
 */
export function minutosAte(minutoDoDia: number, agora: Date): number {
  const agoraMin = agora.getHours() * 60 + agora.getMinutes();
  const faltam = (minutoDoDia - agoraMin + DIA_MIN) % DIA_MIN;
  return faltam > DIA_MIN - PASSOU_HA_ATE_MIN ? 0 : faltam;
}

/** "até as 22h15", "até a 1h", "até a meia-noite": o horário do "Outro horário" no texto. */
export function ateAs(minutoDoDia: number): string {
  if (minutoDoDia === 0) return "até a meia-noite";
  if (minutoDoDia === 12 * 60) return "até o meio-dia";
  const hora = Math.floor(minutoDoDia / 60);
  const minuto = minutoDoDia % 60;
  const rotulo = `${hora}h${minuto ? String(minuto).padStart(2, "0") : ""}`;
  return `${hora <= 1 ? "até a" : "até as"} ${rotulo}`;
}

/** O valor de um `<input type="time">` ("22:15") em minutos do dia, ou `null` se inválido. */
export function lerHorario(valor: string): number | null {
  const partes = /^(\d{2}):(\d{2})$/.exec(valor);
  if (!partes) return null;
  const [hora, minuto] = [Number(partes[1]), Number(partes[2])];
  return hora < 24 && minuto < 60 ? hora * 60 + minuto : null;
}
