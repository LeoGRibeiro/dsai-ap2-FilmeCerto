import { describe, expect, it } from "vitest";

import { devePerguntar, visitaNova, type ControleEscolha } from "@/features/como-foi/regras";

const agora = new Date("2026-11-19T21:00:00-03:00");
const horasAtras = (horas: number) => new Date(agora.getTime() - horas * 3_600_000).toISOString();

function escolha(sobrescrever: Partial<ControleEscolha> = {}): ControleEscolha {
  return {
    escolhido_em: horasAtras(24),
    perguntado_em: null,
    vezes_perguntado: 0,
    respondido_em: null,
    ...sobrescrever,
  };
}

describe("devePerguntar", () => {
  it.each([
    ["escolhida há 2h59", { escolhido_em: horasAtras(2.99) }, false],
    ["escolhida há 3h", { escolhido_em: horasAtras(3) }, true],
    ["já respondida", { respondido_em: horasAtras(1) }, false],
    ["nunca perguntada", {}, true],
    ["perguntada uma vez, ontem", { vezes_perguntado: 1, perguntado_em: horasAtras(20) }, true],
    ["perguntada duas vezes, há 30 min", { vezes_perguntado: 2, perguntado_em: horasAtras(0.5) }, true],
    ["perguntada duas vezes, há 1h", { vezes_perguntado: 2, perguntado_em: horasAtras(1) }, false],
    ["perguntada duas vezes, ontem", { vezes_perguntado: 2, perguntado_em: horasAtras(20) }, false],
  ] as const)("%s: %s", (_caso, dados, esperado) => {
    expect(devePerguntar(escolha(dados), agora)).toBe(esperado);
  });
});

describe("visitaNova", () => {
  it.each([
    ["sem exibição anterior", null, true],
    ["exibida há 59 min", horasAtras(59 / 60), false],
    ["exibida há 1h", horasAtras(1), true],
    ["exibida ontem", horasAtras(20), true],
  ])("%s: %s", (_caso, perguntadoEm, esperado) => {
    expect(visitaNova(escolha({ perguntado_em: perguntadoEm, vezes_perguntado: 1 }), agora)).toBe(
      esperado,
    );
  });
});
