import { describe, expect, it } from "vitest";

import {
  ateAClassificacao,
  classificacaoDaSerie,
  classificacaoDoFilme,
  temasDaSerie,
  temasDoFilme,
  traduzirTemas,
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

describe("traduzirTemas", () => {
  it.each([
    ["Extreme Violence", "violencia"],
    ["Gory Scenes", "violencia"],
    ["Injury", "violencia"],
    ["Fear", "medo"],
    ["Violence / Horror", "violencia"],
    ["Threat", "medo"],
    ["may cause anxiety", "medo"],
    ["Sexuality", "sexo"],
    ["Drugs", "drogas"],
    ["Alcohol", "drogas"],
    ["Coarse Language", "linguagem"],
    ["Shocking Content", "impactante"],
    ["Discrimination", "discriminacao"],
  ])("%s vira %s", (texto, tema) => {
    expect(traduzirTemas([texto])).toContain(tema);
  });

  it("junta sem repetir, na ordem da lista, e ignora o que não se encaixa", () => {
    expect(
      traduzirTemas([
        "Shocking Content",
        "Fear",
        "Violence",
        "Extreme Violence",
        "Negative examples",
      ]),
    ).toEqual(["violencia", "medo", "impactante"]);
    expect(traduzirTemas(["Not Recommended For Young Children"])).toEqual([]);
  });
});

describe("temasDoFilme", () => {
  const pais = (iso_3166_1: string, ...descritores: string[][]) => ({
    iso_3166_1,
    release_dates: descritores.map((descriptors) => ({ descriptors })),
  });

  it("os do Brasil ganham, mesmo com outros países preenchidos", () => {
    expect(
      temasDoFilme([pais("NL", ["Coarse Language"]), pais("BR", [], ["Extreme Violence", "Fear"])]),
    ).toEqual({ temas: ["violencia", "medo"], pais: "BR" });
  });

  it("sem os do Brasil, os da Holanda; sem estes, os da Alemanha", () => {
    expect(temasDoFilme([pais("DE", ["Threat"]), pais("NL", ["Violence"])])).toEqual({
      temas: ["violencia"],
      pais: "NL",
    });
    expect(temasDoFilme([pais("BR", []), pais("DE", ["Threat", "Injury"])])).toEqual({
      temas: ["violencia", "medo"],
      pais: "DE",
    });
  });

  it("um país só com temas que não se encaixam passa para o próximo", () => {
    expect(temasDoFilme([pais("BR", ["Negative examples"]), pais("NL", ["Fear"])])).toEqual({
      temas: ["medo"],
      pais: "NL",
    });
  });

  it("outros países e listas vazias dão null", () => {
    expect(temasDoFilme([pais("TR", ["Violence / Horror"]), pais("US", [])])).toBeNull();
    expect(temasDoFilme([])).toBeNull();
  });
});

describe("temasDaSerie", () => {
  it("segue a mesma ordem de países", () => {
    expect(
      temasDaSerie([
        { iso_3166_1: "US", descriptors: ["Violence"] },
        { iso_3166_1: "DE", descriptors: ["Drugs"] },
      ]),
    ).toEqual({ temas: ["drogas"], pais: "DE" });
    expect(temasDaSerie([{ iso_3166_1: "BR" }])).toBeNull();
  });
});
