import { describe, expect, it } from "vitest";

import { minutosAte } from "@/features/noite/termina";

/** 18/11/2026 às `hora`:`minuto`, no fuso de quem roda o teste (como no navegador). */
const as = (hora: number, minuto = 0) => new Date(2026, 10, 18, hora, minuto);

describe("minutosAte", () => {
  it.each([
    ["21h30 até 23h", as(21, 30), 23, 90],
    ["21h30 até 22h", as(21, 30), 22, 30],
    ["23h30 até 1h, virando a meia-noite", as(23, 30), 1, 90],
    ["23h30 até meia-noite", as(23, 30), 0, 30],
    ["22h até meia-noite", as(22), 0, 120],
    ["0h20 até 1h, já depois da meia-noite", as(0, 20), 1, 40],
    ["15h até 22h, ainda de tarde", as(15), 22, 420],
    ["11h até meia-noite, de manhã", as(11), 0, 780],
  ])("%s: %i min", (_caso, agora, hora, esperado) => {
    expect(minutosAte(hora, agora)).toBe(esperado);
  });

  it.each([
    ["23h30 com 23h", as(23, 30), 23],
    ["0h30 com meia-noite (não é a de amanhã)", as(0, 30), 0],
    ["1h com 22h", as(1), 22],
    ["exatamente 23h com 23h", as(23), 23],
  ])("devolve 0 quando a hora já passou: %s", (_caso, agora, hora) => {
    expect(minutosAte(hora, agora)).toBe(0);
  });
});
