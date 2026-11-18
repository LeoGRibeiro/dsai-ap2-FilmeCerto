import { afterEach, describe, expect, it, vi } from "vitest";

import { enviarEvento, ROTA_EVENTOS } from "@/features/metricas/enviar";

const evento = { nome: "wizard_abandonado", dados: { etapa: "resultado" } } as const;

describe("enviarEvento", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("usa sendBeacon com o JSON do evento", () => {
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal("navigator", { sendBeacon });
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    enviarEvento(evento);

    expect(sendBeacon).toHaveBeenCalledWith(ROTA_EVENTOS, JSON.stringify(evento));
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["sem sendBeacon", {}],
    ["com a fila do sendBeacon cheia", { sendBeacon: () => false }],
  ])("cai para fetch com keepalive %s", (_caso, navegador) => {
    vi.stubGlobal("navigator", navegador);
    const fetch = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);

    enviarEvento(evento);

    expect(fetch).toHaveBeenCalledWith(ROTA_EVENTOS, {
      method: "POST",
      body: JSON.stringify(evento),
      keepalive: true,
    });
  });

  it("nunca lança, mesmo se o envio falhar", async () => {
    vi.stubGlobal("navigator", {
      sendBeacon: () => {
        throw new TypeError("bloqueado");
      },
    });
    expect(() => enviarEvento(evento)).not.toThrow();

    vi.stubGlobal("navigator", {});
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    expect(() => enviarEvento(evento)).not.toThrow();
    await Promise.resolve();
  });
});
