import { describe, expect, it } from "vitest";

import {
  FAIXAS_IDADE,
  LIMITES,
  MODOS,
  ehLimite,
  type FiltroConteudo,
} from "@/features/filtro-conteudo/opcoes";
import {
  acimaDoLimite,
  limiteDasRecomendacoes,
  limiteMaisRestrito,
  tratamento,
  type Tela,
  type Tratamento,
} from "@/features/filtro-conteudo/regras";
import { ateAClassificacao, CLASSIFICACOES_BR } from "@/lib/tmdb/classificacao";

describe("acimaDoLimite", () => {
  it("com limite 14, passa do limite só o que é 16, 18 ou desconhecido", () => {
    const acima = CLASSIFICACOES_BR.filter((c) => acimaDoLimite(c, "14"));
    expect(acima).toEqual(["16", "18"]);
    expect(acimaDoLimite(null, "14")).toBe(true);
    expect(acimaDoLimite(undefined, "14")).toBe(true);
  });

  it("o próprio limite não passa dele, para cada limite", () => {
    for (const limite of LIMITES) {
      expect(acimaDoLimite(limite, limite)).toBe(false);
      const proxima = CLASSIFICACOES_BR[CLASSIFICACOES_BR.indexOf(limite) + 1]!;
      expect(acimaDoLimite(proxima, limite)).toBe(true);
    }
  });

  it("Livre só deixa passar Livre", () => {
    expect(CLASSIFICACOES_BR.filter((c) => !acimaDoLimite(c, "L"))).toEqual(["L"]);
  });

  it("é o contrário de ateAClassificacao, que o wizard usa", () => {
    for (const c of [...CLASSIFICACOES_BR, null]) {
      expect(acimaDoLimite(c, "12")).toBe(!ateAClassificacao(c, "12"));
    }
  });
});

describe("tratamento", () => {
  const com = (modo: FiltroConteudo["modo"]): FiltroConteudo => ({ limite: "14", modo });

  const TABELA: [Tela, Tratamento, Tratamento, Tratamento][] = [
    ["recomendacao", "borrado", "oculto", "oculto"],
    ["busca", "borrado", "borrado", "oculto"],
    ["lista", "borrado", "borrado", "borrado-fixo"],
    ["pagina", "borrado", "aviso", "bloqueado"],
  ];

  it.each(TABELA)("%s: avisar → %s, ocultar → %s, bloquear → %s", (tela, ...esperados) => {
    expect(MODOS.map((modo) => tratamento(tela, "18", com(modo)))).toEqual(esperados);
  });

  it("título sem classificação recebe o mesmo tratamento que um acima do limite", () => {
    expect(tratamento("busca", null, com("bloquear"))).toBe("oculto");
    expect(tratamento("pagina", null, com("ocultar"))).toBe("aviso");
  });

  it("dentro do limite, é normal em qualquer tela e modo", () => {
    for (const [tela] of TABELA) {
      for (const modo of MODOS) expect(tratamento(tela, "14", com(modo))).toBe("normal");
    }
  });

  it("com o filtro desligado, tudo é normal, até o 18 e o desconhecido", () => {
    for (const [tela] of TABELA) {
      expect(tratamento(tela, "18", null)).toBe("normal");
      expect(tratamento(tela, null, null)).toBe("normal");
    }
  });
});

describe("limiteDasRecomendacoes", () => {
  it("só Ocultar e Bloquear tiram títulos das recomendações", () => {
    expect(limiteDasRecomendacoes({ limite: "12", modo: "ocultar" })).toBe("12");
    expect(limiteDasRecomendacoes({ limite: "10", modo: "bloquear" })).toBe("10");
    expect(limiteDasRecomendacoes({ limite: "12", modo: "avisar" })).toBeNull();
    expect(limiteDasRecomendacoes(null)).toBeNull();
  });
});

describe("limiteMaisRestrito", () => {
  it("fica com o menor limite dado", () => {
    expect(limiteMaisRestrito("12", "10")).toBe("10");
    expect(limiteMaisRestrito("16", "12", "14")).toBe("12");
    expect(limiteMaisRestrito("L", "18")).toBe("L");
  });

  it("ignora os ausentes, e sem nenhum devolve null", () => {
    expect(limiteMaisRestrito(null, "16", undefined)).toBe("16");
    expect(limiteMaisRestrito(null, undefined)).toBeNull();
    expect(limiteMaisRestrito()).toBeNull();
  });
});

describe("FAIXAS_IDADE", () => {
  it("segue a tabela da spec, com Adulto desligado", () => {
    expect(
      FAIXAS_IDADE.map((f) => [f.rotulo, f.filtro?.limite ?? null, f.filtro?.modo ?? null]),
    ).toEqual([
      ["Adulto", null, null],
      ["16 ou 17 anos", "16", "ocultar"],
      ["14 ou 15 anos", "14", "ocultar"],
      ["12 ou 13 anos", "12", "bloquear"],
      ["10 ou 11 anos", "10", "bloquear"],
      ["Até 9 anos", "L", "bloquear"],
    ]);
  });

  it("todo limite sugerido é um limite válido", () => {
    for (const faixa of FAIXAS_IDADE)
      if (faixa.filtro) expect(ehLimite(faixa.filtro.limite)).toBe(true);
    expect(ehLimite("18")).toBe(false);
    expect(ehLimite(14)).toBe(false);
  });
});
