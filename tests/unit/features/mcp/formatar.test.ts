import { describe, expect, it } from "vitest";

import { encurtar, erro, linkFilme, nomesGeneros, ok, resumoFilme } from "@/features/mcp/formatar";

describe("formatar", () => {
  it("troca ids de gênero por nomes e ignora ids desconhecidos", () => {
    expect(nomesGeneros([18, 53, 999])).toEqual(["Drama", "Thriller"]);
  });
  it("encurta com reticências só quando passa do limite", () => {
    expect(encurtar("curto")).toBe("curto");
    const longo = "a".repeat(250);
    expect(encurtar(longo)).toHaveLength(200);
    expect(encurtar(longo).endsWith("…")).toBe(true);
  });
  it("monta link, resumo, ok e erro", () => {
    expect(linkFilme("https://x.app", 550)).toBe("https://x.app/filme/550");
    expect(
      resumoFilme(
        { id: 550, titulo: "Clube da Luta", tituloOriginal: "Fight Club", sinopse: "", posterPath: null,
          backdropPath: null, generos: [18], ano: 1999, nota: 8.438, votos: 1, popularidade: 1 },
        "https://x.app",
      ),
    ).toEqual({ tmdb_id: 550, titulo: "Clube da Luta", ano: 1999, generos: ["Drama"], nota: 8.4, link: "https://x.app/filme/550" });
    expect(ok({ a: 1 })).toEqual({ content: [{ type: "text", text: '{"a":1}' }] });
    expect(erro("ruim")).toEqual({ content: [{ type: "text", text: "ruim" }], isError: true });
  });
});
