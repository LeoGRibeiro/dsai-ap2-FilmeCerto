import { describe, expect, it } from "vitest";

import { caminhoCompartilhado, caminhoMidia, lerMidia } from "@/lib/midia";

describe("lerMidia", () => {
  it("um número sozinho é filme, como na AP1", () => {
    expect(lerMidia(550)).toEqual({ tipo: "filme", tmdbId: 550 });
  });

  it("mantém o tipo informado", () => {
    expect(lerMidia({ tipo: "serie", tmdbId: 1399 })).toEqual({ tipo: "serie", tmdbId: 1399 });
  });
});

describe("caminhoMidia", () => {
  it("leva cada tipo à sua página", () => {
    expect(caminhoMidia({ tipo: "filme", tmdbId: 550 })).toBe("/filme/550");
    expect(caminhoMidia({ tipo: "serie", tmdbId: 1399 })).toBe("/serie/1399");
  });
});

describe("caminhoCompartilhado", () => {
  it("leva à página pública de cada tipo", () => {
    expect(caminhoCompartilhado({ tipo: "filme", tmdbId: 550 })).toBe("/compartilhado/filme/550");
    expect(caminhoCompartilhado({ tipo: "serie", tmdbId: 1399 })).toBe("/compartilhado/serie/1399");
  });
});
