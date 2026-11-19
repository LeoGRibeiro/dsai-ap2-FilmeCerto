import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Temporadas } from "@/features/serie/components/temporadas";
import { contar, dadosDaSerie, rotuloClassificacao } from "@/features/serie/formatar";
import type { SerieDetalhes } from "@/lib/tmdb/tipos";

function serie(sobrescrever: Partial<SerieDetalhes> = {}): SerieDetalhes {
  return {
    id: 1399,
    titulo: "A Guerra dos Tronos",
    tituloOriginal: "Game of Thrones",
    sinopse: "Famílias nobres disputam o Trono de Ferro.",
    posterPath: null,
    backdropPath: null,
    generos: [{ id: 10765, nome: "Sci-Fi & Fantasy" }],
    ano: 2011,
    nota: 8.46,
    votos: 25000,
    popularidade: 300,
    duracaoEpisodioMin: 57,
    temporadas: [
      { numero: 1, nome: "Temporada 1", episodios: 10, ano: 2011, posterPath: "/t1.jpg" },
      { numero: 2, nome: "Temporada 2", episodios: 1, ano: null, posterPath: null },
    ],
    slogan: null,
    trailerYoutube: null,
    elenco: [],
    criacao: ["David Benioff"],
    classificacao: "16",
    ondeAssistir: null,
    ...sobrescrever,
  };
}

describe("formatar da série", () => {
  it("contar usa o singular só para 1", () => {
    expect(contar(1, "temporada", "temporadas")).toBe("1 temporada");
    expect(contar(2, "temporada", "temporadas")).toBe("2 temporadas");
    expect(contar(0, "episódio", "episódios")).toBe("0 episódios");
  });

  it.each([
    ["L", "Livre"],
    ["12", "12 anos"],
    ["18", "18 anos"],
    [null, null],
  ] as const)("rotuloClassificacao(%j) = %j", (classificacao, rotulo) => {
    expect(rotuloClassificacao(classificacao)).toBe(rotulo);
  });

  it("dadosDaSerie mostra ano, temporadas, episódio, classificação e nota", () => {
    expect(dadosDaSerie(serie())).toEqual([
      "2011",
      "2 temporadas",
      "Episódios de 57min",
      "16 anos",
      "★ 8.5 (25.000 votos)",
    ]);
  });

  it("dadosDaSerie deixa nulo o que falta e usa o singular", () => {
    const [primeira] = serie().temporadas;
    expect(
      dadosDaSerie(
        serie({ ano: null, temporadas: [primeira], duracaoEpisodioMin: null, classificacao: null }),
      ),
    ).toEqual([null, "1 temporada", null, null, "★ 8.5 (25.000 votos)"]);
    expect(dadosDaSerie(serie({ temporadas: [], duracaoEpisodioMin: 75 }))[1]).toBeNull();
    expect(dadosDaSerie(serie({ duracaoEpisodioMin: 75 }))[2]).toBe("Episódios de 1h 15min");
  });
});

describe("Temporadas", () => {
  it("mostra nome, ano e episódios de cada temporada, na ordem", () => {
    render(<Temporadas temporadas={serie().temporadas} />);
    const itens = screen.getAllByRole("listitem");
    expect(itens).toHaveLength(2);
    expect(within(itens[0]).getByText("Temporada 1")).toBeInTheDocument();
    expect(within(itens[0]).getByText("2011 · 10 episódios")).toBeInTheDocument();
    expect(itens[0].querySelector("img")?.getAttribute("src")).toContain("t1.jpg");
    expect(within(itens[1]).getByText("Temporada 2")).toBeInTheDocument();
    expect(within(itens[1]).getByText("1 episódio")).toBeInTheDocument();
    // Sem pôster, o número da temporada no lugar.
    expect(within(itens[1]).getByText("2")).toBeInTheDocument();
  });
});
