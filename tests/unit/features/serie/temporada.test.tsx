import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { lerId } from "@/features/filme/ler-id";
import { Episodios } from "@/features/serie/components/episodios";
import {
  cercaDe,
  detalhesDoEpisodio,
  formatarData,
  tempoDaTemporada,
  vizinhas,
} from "@/features/serie/temporada";
import type { Episodio } from "@/lib/tmdb/tipos";

const HOJE = "2026-11-19";

function episodio(numero: number, extra: Partial<Episodio> = {}): Episodio {
  return {
    numero,
    nome: `Episódio ${numero}`,
    sinopse: `Sinopse ${numero}.`,
    duracaoMin: 50,
    data: "2025-10-03",
    stillPath: null,
    nota: 8.14,
    ...extra,
  };
}

const temporadas = [1, 2, 3].map((numero) => ({
  numero,
  nome: `Temporada ${numero}`,
  episodios: 3,
  ano: 2020 + numero,
  posterPath: null,
}));

describe("formatação da temporada", () => {
  it("formatarData e cercaDe", () => {
    expect(formatarData("2026-12-12")).toBe("12/12/2026");
    expect(cercaDe(452)).toBe("cerca de 7h 30min");
    expect(cercaDe(58)).toBe("cerca de 1h");
    expect(cercaDe(2)).toBeNull();
    expect(cercaDe(null)).toBeNull();
  });

  it("o tempo soma os exibidos e usa a duração da série onde falta", () => {
    const episodios = [
      episodio(1, { duracaoMin: 62 }),
      episodio(2, { duracaoMin: null }),
      episodio(3, { data: "2099-01-01", duracaoMin: 60 }),
      episodio(4, { data: null, duracaoMin: 60 }),
    ];
    // 62 + 45 = 107, arredondado para 105; o futuro e o sem data não contam.
    expect(tempoDaTemporada(episodios, 45, HOJE)).toBe("cerca de 1h 45min");
    expect(tempoDaTemporada(episodios, null, HOJE)).toBe("cerca de 1h");
    expect(tempoDaTemporada([episodio(1, { data: "2099-01-01" })], 45, HOJE)).toBeNull();
  });

  it("o episódio exibido mostra duração, data e nota; o não exibido, a estreia sem nota", () => {
    expect(detalhesDoEpisodio(episodio(1), HOJE)).toBe("50min · 03/10/2025 · ★ 8.1");
    expect(detalhesDoEpisodio(episodio(1, { data: HOJE }), HOJE)).toBe(
      "50min · 19/11/2026 · ★ 8.1",
    );
    expect(detalhesDoEpisodio(episodio(2, { data: "2026-12-12", nota: 9 }), HOJE)).toBe(
      "50min · Estreia em 12/12/2026",
    );
    expect(
      detalhesDoEpisodio(episodio(3, { duracaoMin: null, data: null, nota: null }), HOJE),
    ).toBe("");
  });

  it("vizinhas acha a anterior e a próxima só quando existem", () => {
    expect(vizinhas(temporadas, 2)).toEqual({ anterior: temporadas[0], proxima: temporadas[2] });
    expect(vizinhas(temporadas, 1)).toEqual({ anterior: null, proxima: temporadas[1] });
    expect(vizinhas(temporadas, 3)).toEqual({ anterior: temporadas[1], proxima: null });
  });

  it("lerId com limite aceita de 1 a 999", () => {
    expect(lerId("999", 999)).toBe(999);
    expect(lerId("1000", 999)).toBeNull();
    expect(lerId("0", 999)).toBeNull();
  });
});

describe("Episodios", () => {
  it("mostra cada episódio com nome, detalhes, sinopse e imagem (ou o número)", () => {
    render(
      <Episodios
        episodios={[episodio(1, { stillPath: "/e1.jpg" }), episodio(2, { data: "2026-12-12" })]}
        hoje={HOJE}
      />,
    );
    const [primeiro, segundo] = screen.getAllByRole("listitem");
    expect(within(primeiro).getByText("1. Episódio 1")).toBeInTheDocument();
    expect(within(primeiro).getByText("50min · 03/10/2025 · ★ 8.1")).toBeInTheDocument();
    expect(within(primeiro).getByText("Sinopse 1.")).toBeInTheDocument();
    expect(primeiro.querySelector("img")?.getAttribute("src")).toContain("w300%2Fe1.jpg");
    expect(within(segundo).getByText("Estreia em", { exact: false })).toHaveTextContent(
      "50min · Estreia em 12/12/2026",
    );
    expect(within(segundo).queryByText(/★/)).toBeNull();
    expect(segundo.querySelector("img")).toBeNull();
    expect(within(segundo).getByText("2")).toBeInTheDocument();
  });
});
