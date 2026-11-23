import { describe, expect, it } from "vitest";

import { ehLimite, OPCOES_FILTRO, type FiltroConteudo } from "@/features/filtro-conteudo/opcoes";
import {
  bloqueado,
  limiteDasRecomendacoes,
  limiteMaisRestrito,
  tratamento,
  type Tratamento,
} from "@/features/filtro-conteudo/regras";
import { CLASSIFICACOES_BR } from "@/lib/tmdb/classificacao";
import type { ClassificacaoBR } from "@/lib/tmdb/tipos";

const TODAS: (ClassificacaoBR | null)[] = [...CLASSIFICACOES_BR, null];

/** O tratamento de cada classificação (L, 10, 12, 14, 16, 18, sem) com este filtro. */
const linha = (filtro: FiltroConteudo) => TODAS.map((c) => tratamento(c, filtro));

describe("tratamento: a tabela de opções da spec", () => {
  it.each<[string, FiltroConteudo, Tratamento[]]>([
    ["Sem filtro", null, ["normal", "normal", "normal", "normal", "normal", "normal", "normal"]],
    ["Até 10 anos", "10", ["normal", "normal", "aviso", "aviso", "aviso", "bloqueado", "aviso"]],
    ["Até 14 anos", "14", ["normal", "normal", "normal", "normal", "aviso", "bloqueado", "aviso"]],
    [
      "Sem conteúdo +18",
      "18",
      ["normal", "normal", "normal", "normal", "normal", "bloqueado", "aviso"],
    ],
  ])("%s", (_, filtro, esperado) => {
    expect(linha(filtro)).toEqual(esperado);
  });

  it("sem classificação nunca é bloqueado, com qualquer filtro", () => {
    for (const filtro of ["10", "14", "18"] as const) {
      expect(bloqueado(null, filtro)).toBe(false);
      expect(bloqueado(undefined, filtro)).toBe(false);
    }
  });

  it("só o 18 é bloqueado, e só com filtro", () => {
    expect(TODAS.filter((c) => bloqueado(c, "10"))).toEqual(["18"]);
    expect(bloqueado("18", null)).toBe(false);
  });
});

describe("limiteDasRecomendacoes", () => {
  it("com qualquer filtro, as recomendações vão até 16; sem filtro, sem limite", () => {
    expect(limiteDasRecomendacoes("10")).toBe("16");
    expect(limiteDasRecomendacoes("14")).toBe("16");
    expect(limiteDasRecomendacoes("18")).toBe("16");
    expect(limiteDasRecomendacoes(null)).toBeNull();
  });
});

describe("limiteMaisRestrito", () => {
  it("fica com o menor limite dado", () => {
    expect(limiteMaisRestrito("12", "16")).toBe("12");
    expect(limiteMaisRestrito("16", "10", "14")).toBe("10");
    expect(limiteMaisRestrito("L", "18")).toBe("L");
  });

  it("ignora os ausentes, e sem nenhum devolve null", () => {
    expect(limiteMaisRestrito(null, "16", undefined)).toBe("16");
    expect(limiteMaisRestrito(null, undefined)).toBeNull();
    expect(limiteMaisRestrito()).toBeNull();
  });
});

describe("OPCOES_FILTRO", () => {
  it("são as quatro opções da spec, com Sem filtro primeiro", () => {
    expect(OPCOES_FILTRO.map((o) => [o.valor, o.rotulo])).toEqual([
      ["sem", "Sem filtro"],
      ["10", "Até 10 anos"],
      ["14", "Até 14 anos"],
      ["18", "Sem conteúdo +18"],
    ]);
  });

  it("ehLimite aceita só 10, 14 e 18", () => {
    expect(["10", "14", "18"].every(ehLimite)).toBe(true);
    expect(["L", "12", "16", "sem", 10, null].some(ehLimite)).toBe(false);
  });
});
