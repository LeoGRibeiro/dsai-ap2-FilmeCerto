import { describe, expect, it } from "vitest";

import { ehLimite, OPCOES_FILTRO, type FiltroConteudo } from "@/features/filtro-conteudo/opcoes";
import {
  bloqueado,
  foraDasRecomendacoes,
  limiteDaBusca,
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
  it("as recomendações vão até o limite do filtro; com Sem conteúdo +18, até 16", () => {
    expect(limiteDasRecomendacoes("10")).toBe("10");
    expect(limiteDasRecomendacoes("14")).toBe("14");
    expect(limiteDasRecomendacoes("18")).toBe("16");
    expect(limiteDasRecomendacoes(null)).toBeNull();
  });

  it("a busca por filtros vai até 16 com qualquer filtro; sem filtro, sem limite", () => {
    expect(["10", "14", "18"].map((f) => limiteDaBusca(f as FiltroConteudo))).toEqual([
      "16",
      "16",
      "16",
    ]);
    expect(limiteDaBusca(null)).toBeNull();
  });
});

describe("foraDasRecomendacoes", () => {
  /** As classificações (L, 10, 12, 14, 16, 18, sem) que saem das recomendações. */
  const saem = (filtro: FiltroConteudo) => TODAS.filter((c) => foraDasRecomendacoes(c, filtro));

  it("sai o que passa do limite, o 18 inclusive; o sem classificação fica", () => {
    expect(saem("10")).toEqual(["12", "14", "16", "18"]);
    expect(saem("14")).toEqual(["16", "18"]);
    expect(saem("18")).toEqual(["18"]);
  });

  it("sem filtro, nada sai", () => {
    expect(saem(null)).toEqual([]);
  });

  it("todo título com aviso por classificação sai; o com aviso por falta dela, não", () => {
    for (const filtro of ["10", "14", "18"] as const) {
      for (const c of TODAS) {
        const comAviso = tratamento(c, filtro) !== "normal";
        expect(foraDasRecomendacoes(c, filtro)).toBe(comAviso && c !== null);
      }
    }
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
