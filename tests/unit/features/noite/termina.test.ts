import { describe, expect, it } from "vitest";

import { ateAs, lerHorario, minutosAte } from "@/features/noite/termina";

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
    expect(minutosAte(hora * 60, agora)).toBe(esperado);
  });

  it.each([
    ["21h30 até 22h15", as(21, 30), 22 * 60 + 15, 45],
    ["23h30 até 0h30, virando a meia-noite", as(23, 30), 30, 60],
    ["16h06 até 18h06", as(16, 6), 18 * 60 + 6, 120],
    ["16h06 até 10h: mais de 6 h para trás, é a de amanhã", as(16, 6), 10 * 60, 1074],
  ])("com minutos quebrados, %s: %i min", (_caso, agora, minutoDoDia, esperado) => {
    expect(minutosAte(minutoDoDia, agora)).toBe(esperado);
  });

  it.each([
    ["23h30 com 23h", as(23, 30), 23 * 60],
    ["0h30 com meia-noite (não é a de amanhã)", as(0, 30), 0],
    ["1h com 22h", as(1), 22 * 60],
    ["exatamente 23h com 23h", as(23), 23 * 60],
    ["16h06 com 15h50", as(16, 6), 15 * 60 + 50],
  ])("devolve 0 quando o horário já passou: %s", (_caso, agora, minutoDoDia) => {
    expect(minutosAte(minutoDoDia, agora)).toBe(0);
  });
});

describe("ateAs", () => {
  it.each([
    [22 * 60, "até as 22h"],
    [22 * 60 + 15, "até as 22h15"],
    [18 * 60 + 6, "até as 18h06"],
    [60, "até a 1h"],
    [30, "até a 0h30"],
    [0, "até a meia-noite"],
    [12 * 60, "até o meio-dia"],
  ])("%i min do dia: %s", (minutoDoDia, esperado) => {
    expect(ateAs(minutoDoDia)).toBe(esperado);
  });
});

describe("lerHorario", () => {
  it("lê o valor do seletor de horário em minutos do dia", () => {
    expect(lerHorario("22:15")).toBe(1335);
    expect(lerHorario("00:00")).toBe(0);
    expect(lerHorario("23:59")).toBe(1439);
  });

  it.each(["", "22h15", "24:00", "22:60", "9:30", "22:15:00"])("recusa %j", (valor) => {
    expect(lerHorario(valor)).toBeNull();
  });
});
