import { describe, expect, it, vi } from "vitest";

import {
  metadadosCompartilhado,
  sinopseCurta,
  TITULO_ADULTO,
} from "@/features/compartilhado/metadados";
import { buscarCompartilhado, lerCompartilhado } from "@/features/compartilhado/titulo";
import { obterFilme } from "@/lib/tmdb/filmes";
import { obterSerie } from "@/lib/tmdb/series";

import { filmeCompartilhado, serieCompartilhada } from "./fabrica";

vi.mock("@/lib/tmdb/filmes", () => ({ obterFilme: vi.fn() }));
vi.mock("@/lib/tmdb/series", () => ({ obterSerie: vi.fn() }));

describe("sinopseCurta", () => {
  it("não mexe em texto curto, só tira os espaços das pontas", () => {
    expect(sinopseCurta("  Um hacker descobre a verdade. ")).toBe("Um hacker descobre a verdade.");
  });

  it("corta no fim da última palavra inteira que cabe, com reticências", () => {
    expect(sinopseCurta("Um hacker descobre, enfim, a verdade", 22)).toBe("Um hacker descobre…");
    expect(sinopseCurta("x".repeat(300))).toHaveLength(281);
  });
});

describe("metadadosCompartilhado", () => {
  it("dá título com ano, a sinopse como descrição e o pôster w500 do TMDB no og:image", () => {
    const metadados = metadadosCompartilhado(filmeCompartilhado());

    expect(metadados.title).toBe("Matrix (1999)");
    expect(metadados.description).toBe("Um hacker descobre a verdade sobre a realidade.");
    expect(metadados.robots).toEqual({ index: false, follow: false });
    expect(metadados.openGraph).toMatchObject({
      title: "Matrix (1999)",
      description: "Um hacker descobre a verdade sobre a realidade.",
      siteName: "Filme Certo",
      type: "video.movie",
      images: [
        {
          url: "https://image.tmdb.org/t/p/w500/matrix.jpg",
          width: 500,
          height: 750,
          alt: "Matrix",
        },
      ],
    });
  });

  it("série sem pôster: tipo de TV e nenhuma imagem; sem sinopse, a descrição fala de onde assistir", () => {
    const metadados = metadadosCompartilhado(serieCompartilhada({ sinopse: "" }));

    expect(metadados.description).toBe("Onde assistir Dark no Brasil.");
    expect(metadados.openGraph).toMatchObject({ type: "video.tv_show" });
    expect(metadados.openGraph).not.toHaveProperty("images");
  });

  it("+18: nem o nome nem a imagem vão para a prévia", () => {
    const metadados = metadadosCompartilhado(filmeCompartilhado({ classificacao: "18" }));

    expect(metadados).toEqual({ title: TITULO_ADULTO, robots: { index: false, follow: false } });
    expect(JSON.stringify(metadados)).not.toContain("Matrix");
  });

  it("título inexistente", () => {
    expect(metadadosCompartilhado(null)).toEqual({ title: "Título não encontrado" });
  });
});

describe("lerCompartilhado", () => {
  it("aceita filme e série com ID válido", () => {
    expect(lerCompartilhado("filme", "603")).toEqual({ tipo: "filme", tmdbId: 603 });
    expect(lerCompartilhado("serie", "70523")).toEqual({ tipo: "serie", tmdbId: 70523 });
  });

  it.each([
    ["pessoa", "603"],
    ["filme", "abc"],
    ["serie", "0"],
  ])("recusa /%s/%s", (tipo, id) => {
    expect(lerCompartilhado(tipo, id)).toBeNull();
  });
});

describe("buscarCompartilhado", () => {
  it("busca o filme ou a série pelo tipo da rota", async () => {
    const { titulo: filme } = filmeCompartilhado();
    const { titulo: serie } = serieCompartilhada();
    vi.mocked(obterFilme).mockResolvedValue(filme as never);
    vi.mocked(obterSerie).mockResolvedValue(serie as never);

    expect(await buscarCompartilhado("filme", "603")).toEqual({ tipo: "filme", titulo: filme });
    expect(await buscarCompartilhado("serie", "70523")).toEqual({ tipo: "serie", titulo: serie });
    expect(obterFilme).toHaveBeenCalledExactlyOnceWith(603);
    expect(obterSerie).toHaveBeenCalledExactlyOnceWith(70523);
  });

  it("tipo desconhecido, ID inválido ou título que o TMDB não conhece dão null", async () => {
    vi.mocked(obterFilme).mockClear().mockResolvedValue(null);

    expect(await buscarCompartilhado("pessoa", "603")).toBeNull();
    expect(await buscarCompartilhado("filme", "abc")).toBeNull();
    expect(await buscarCompartilhado("filme", "999000001")).toBeNull();
    expect(obterFilme).toHaveBeenCalledExactlyOnceWith(999000001);
  });
});
