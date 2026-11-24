import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TemporadaPage, { generateMetadata } from "@/app/(app)/serie/[id]/temporada/[numero]/page";
import { lerId } from "@/features/filme/ler-id";
import { Episodios } from "@/features/serie/components/episodios";
import {
  cercaDe,
  detalhesDoEpisodio,
  formatarData,
  tempoDaTemporada,
  vizinhas,
} from "@/features/serie/temporada";
import { obterFiltro } from "@/features/filtro-conteudo/consultas";
import { obterSerie, obterTemporada } from "@/lib/tmdb/series";
import type { Episodio, SerieDetalhes, TemporadaDetalhes } from "@/lib/tmdb/tipos";

vi.mock("@/lib/tmdb/series", () => ({ obterSerie: vi.fn(), obterTemporada: vi.fn() }));
vi.mock("@/features/filtro-conteudo/consultas", () => ({ obterFiltro: vi.fn(async () => null) }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

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

function serie(extra: Partial<SerieDetalhes> = {}): SerieDetalhes {
  return {
    id: 1399,
    titulo: "A Guerra dos Tronos",
    tituloOriginal: "Game of Thrones",
    sinopse: "",
    posterPath: "/serie.jpg",
    backdropPath: null,
    generos: [],
    ano: 2011,
    nota: 8.5,
    votos: 100,
    popularidade: 1,
    duracaoEpisodioMin: 45,
    temporadas,
    slogan: null,
    trailerYoutube: null,
    elenco: [],
    criacao: [],
    classificacao: null,
    ondeAssistir: null,
    ...extra,
  };
}

function temporada(numero: number, extra: Partial<TemporadaDetalhes> = {}): TemporadaDetalhes {
  return {
    numero,
    nome: `Temporada ${numero}`,
    sinopse: "O inverno está chegando.",
    ano: 2022,
    posterPath: null,
    episodios: [
      episodio(1),
      episodio(2, { duracaoMin: null }),
      episodio(3, { data: "2099-12-12", duracaoMin: null, nota: null }),
    ],
    ...extra,
  };
}

const props = (id: string, numero: string) => ({
  params: Promise.resolve({ id, numero }),
  searchParams: Promise.resolve({}),
});

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

describe("página da temporada", () => {
  beforeEach(() => {
    vi.mocked(obterSerie).mockResolvedValue(serie());
    vi.mocked(obterTemporada).mockImplementation(async (_, numero) =>
      numero <= 3 ? temporada(numero) : null,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("mostra a temporada, os episódios, o tempo e as duas setas", async () => {
    render(await TemporadaPage(props("1399", "2")));

    expect(obterTemporada).toHaveBeenCalledWith(1399, 2);
    expect(screen.getByRole("link", { name: "A Guerra dos Tronos" })).toHaveAttribute(
      "href",
      "/serie/1399",
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Temporada 2");
    // 50 + 45 (sem duração) = 95; o não exibido não conta.
    for (const dado of ["2022", "3 episódios", "cerca de 1h 35min"]) {
      expect(screen.getByText(dado)).toBeInTheDocument();
    }
    expect(screen.getByText("O inverno está chegando.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Episódios" })).toBeInTheDocument();
    expect(screen.getByText("Estreia em 12/12/2099")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Temporada anterior" })).toHaveAttribute(
      "href",
      "/serie/1399/temporada/1",
    );
    expect(screen.getByRole("link", { name: "Próxima temporada" })).toHaveAttribute(
      "href",
      "/serie/1399/temporada/3",
    );
  });

  it("na primeira não há seta para trás; na última, para frente", async () => {
    const { unmount } = render(await TemporadaPage(props("1399", "1")));
    expect(screen.queryByRole("link", { name: "Temporada anterior" })).toBeNull();
    expect(screen.getByRole("link", { name: "Próxima temporada" })).toBeInTheDocument();
    unmount();

    render(await TemporadaPage(props("1399", "3")));
    expect(screen.getByRole("link", { name: "Temporada anterior" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Próxima temporada" })).toBeNull();
  });

  it("sem pôster da temporada, usa o da série", async () => {
    const { container } = render(await TemporadaPage(props("1399", "1")));
    expect(container.querySelector('img[src*="serie.jpg"]')).not.toBeNull();
  });

  it.each([
    ["temporada 0", "1399", "0"],
    ["número inválido", "1399", "abc"],
    ["número acima de 999", "1399", "1000"],
    ["série inválida", "abc", "1"],
  ])("%s dá notFound sem ir ao TMDB", async (_, id, numero) => {
    await expect(TemporadaPage(props(id, numero))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(obterTemporada).not.toHaveBeenCalled();
    expect(obterSerie).not.toHaveBeenCalled();
  });

  it("série ou temporada inexistente dá notFound", async () => {
    await expect(TemporadaPage(props("1399", "99"))).rejects.toThrow("NEXT_NOT_FOUND");
    vi.mocked(obterSerie).mockResolvedValue(null);
    await expect(TemporadaPage(props("999999999", "1"))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("o título da aba é série e temporada, ou 'Temporada não encontrada'", async () => {
    expect(await generateMetadata(props("1399", "2"))).toEqual({
      title: "A Guerra dos Tronos: Temporada 2",
    });
    expect(await generateMetadata(props("1399", "0"))).toEqual({
      title: "Temporada não encontrada",
    });
  });

  it("série +18 com filtro: a temporada fica bloqueada, sem nome nem imagem, até na aba", async () => {
    vi.mocked(obterFiltro).mockResolvedValue("18");
    vi.mocked(obterSerie).mockResolvedValue(serie({ classificacao: "18" }));

    const { container } = render(await TemporadaPage(props("1399", "2")));
    expect(screen.getByTestId("titulo-bloqueado")).toBeInTheDocument();
    expect(container).not.toHaveTextContent("A Guerra dos Tronos");
    expect(container.querySelector("img")).toBeNull();
    expect(await generateMetadata(props("1399", "2"))).toEqual({ title: "Título indisponível" });
  });

  it("série 16 com 'Até 14 anos' abre com aviso; sem filtro, sem aviso", async () => {
    vi.mocked(obterSerie).mockResolvedValue(serie({ classificacao: "16" }));
    vi.mocked(obterFiltro).mockResolvedValue("14");
    const { unmount } = render(await TemporadaPage(props("1399", "2")));
    expect(screen.getByRole("note")).toHaveTextContent("Não recomendado para menores de 16 anos.");
    expect(screen.getByTestId("selo-classificacao")).toHaveTextContent("16");
    unmount();

    vi.mocked(obterFiltro).mockResolvedValue(null);
    render(await TemporadaPage(props("1399", "2")));
    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.getByTestId("selo-classificacao")).toHaveTextContent("16");
  });
});
