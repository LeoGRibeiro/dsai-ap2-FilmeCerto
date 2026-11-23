import { describe, expect, it } from "vitest";

import {
  ateAClassificacao,
  classificacaoDaSerie,
  classificacaoDoFilme,
} from "@/lib/tmdb/classificacao";

const filme = (...paises: [string, ...string[]][]) =>
  classificacaoDoFilme(
    paises.map(([pais, ...valores]) => ({
      iso_3166_1: pais,
      release_dates: valores.map((certification) => ({ certification })),
    })),
  );

const serie = (...paises: [string, string][]) =>
  classificacaoDaSerie(paises.map(([iso_3166_1, rating]) => ({ iso_3166_1, rating })));

describe("classificacaoDoFilme", () => {
  it("a do Brasil ganha da dos EUA", () => {
    expect(filme(["US", "NC-17"], ["BR", "12"])).toBe("12");
  });

  it("com várias datas no Brasil, vale a mais alta, e as vazias são puladas", () => {
    expect(filme(["BR", "", "14", "12", "  "])).toBe("14");
  });

  it.each([
    ["G", "L"],
    ["PG", "10"],
    ["PG-13", "14"],
    ["R", "16"],
    ["NC-17", "18"],
  ])("sem o Brasil, MPA %s vira %s", (mpa, brasil) => {
    expect(filme(["US", mpa])).toBe(brasil);
  });

  it("dos EUA também vale a mais alta", () => {
    expect(filme(["US", "PG", "R"])).toBe("16");
  });

  it("NR, vazio, valores desconhecidos e outros países viram null", () => {
    expect(filme(["US", "NR", ""])).toBeNull();
    expect(filme(["BR", "ER"], ["DE", "18"], ["GB", "15"])).toBeNull();
    expect(filme()).toBeNull();
  });

  it("um Brasil só com valores vazios cai para os EUA", () => {
    expect(filme(["BR", ""], ["US", "G"])).toBe("L");
  });
});

describe("classificacaoDaSerie", () => {
  it("a do Brasil ganha da dos EUA", () => {
    expect(serie(["US", "TV-Y"], ["BR", "16"])).toBe("16");
  });

  it.each([
    ["TV-Y", "L"],
    ["TV-G", "L"],
    ["TV-Y7", "10"],
    ["TV-PG", "10"],
    ["TV-14", "14"],
    ["TV-MA", "16"],
  ])("sem o Brasil, %s vira %s", (tv, brasil) => {
    expect(serie(["US", tv])).toBe(brasil);
  });

  it("valores desconhecidos viram null", () => {
    expect(serie(["US", "NR"], ["FR", "18"])).toBeNull();
  });

  it("uma série deduzida dos EUA nunca chega a 18", () => {
    expect(serie(["US", "TV-MA"])).not.toBe("18");
  });
});

describe("ateAClassificacao", () => {
  it("desconhecida não passa; conhecida passa até a máxima", () => {
    expect(ateAClassificacao(null, "18")).toBe(false);
    expect(ateAClassificacao("12", "12")).toBe(true);
    expect(ateAClassificacao("14", "12")).toBe(false);
  });
});
