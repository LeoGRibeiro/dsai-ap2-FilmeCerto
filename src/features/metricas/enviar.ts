import type { Evento } from "@/features/metricas/eventos";

export const ROTA_EVENTOS = "/api/eventos";

/**
 * Registra um evento a partir do navegador, sem esperar resposta e sem lançar erro.
 * `sendBeacon` sobrevive ao fechamento da página (necessário para `wizard_abandonado`);
 * o corpo é uma string, então vai como `text/plain` e não precisa de preflight.
 */
export function enviarEvento(evento: Evento): void {
  try {
    const corpo = JSON.stringify(evento);
    if (typeof navigator.sendBeacon === "function" && navigator.sendBeacon(ROTA_EVENTOS, corpo)) {
      return;
    }
    fetch(ROTA_EVENTOS, { method: "POST", body: corpo, keepalive: true }).catch(() => {});
  } catch {
    // Métrica nunca quebra a tela.
  }
}
