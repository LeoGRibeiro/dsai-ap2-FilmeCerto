import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EsqueletoSecoes } from "@/features/dashboard/components/esqueleto-secoes";
import { SecaoSeries } from "@/features/dashboard/components/secao-series";
import type { Secao } from "@/features/recomendacao/tipos";

const mocks = vi.hoisted(() => ({
  obterReacoes: vi.fn(),
  idsNasListas: vi.fn(),
  montarSecaoSeries: vi.fn<() => Promise<Secao | null>>(),
}));
vi.mock("@/features/reacoes/consultas", () => ({ obterReacoes: mocks.obterReacoes }));
vi.mock("@/features/listas/consultas", () => ({ idsNasListas: mocks.idsNasListas }));
vi.mock("@/features/serie/secao-series", () => ({ montarSecaoSeries: mocks.montarSecaoSeries }));

const preferencias = { generos: [28, 18], generosEvitados: [], frequencia: "semanal" as const };

const secao: Secao = {
  id: "series",
  titulo: "Séries para hoje à noite",
  filmes: [
    {
      id: 1399,
      titulo: "Westeros",
      tituloOriginal: "Westeros",
      sinopse: "",
      posterPath: null,
      backdropPath: null,
      generos: [10759],
      ano: 2011,
      nota: 8.4,
      votos: 1000,
      popularidade: 90,
      motivo: "Porque você curte Action & Adventure",
      pontuacao: 90,
      tipo: "serie",
    },
  ],
};

async function renderizar() {
  const elemento = await SecaoSeries({ preferencias, rodada: 2, urlAtual: "/dashboard?rodada=2" });
  return render(<>{elemento}</>);
}

describe("SecaoSeries", () => {
  beforeEach(() => {
    mocks.obterReacoes
      .mockReset()
      .mockResolvedValue([{ tmdbId: 10, reacao: "amei", titulo: "Série 10", generos: [] }]);
    mocks.idsNasListas.mockReset().mockResolvedValue([20]);
    mocks.montarSecaoSeries.mockReset().mockResolvedValue(secao);
  });

  it("lê as reações e as listas de séries e tira essas séries da seção", async () => {
    await renderizar();
    expect(mocks.obterReacoes).toHaveBeenCalledWith(undefined, "serie");
    expect(mocks.idsNasListas).toHaveBeenCalledWith(undefined, "serie");
    expect(mocks.montarSecaoSeries).toHaveBeenCalledWith({
      preferencias,
      rodada: 2,
      excluir: [10, 20],
    });
  });

  it("mostra a seção com cartões que levam à página da série", async () => {
    await renderizar();
    const regiao = screen.getByRole("region", { name: "Séries para hoje à noite" });
    expect(regiao).toBeInTheDocument();
    const cartao = screen.getByRole("link", { name: "Westeros (2011), série" });
    expect(cartao).toHaveAttribute("href", "/serie/1399");
    expect(screen.getByText("Série · 2011 · ★ 8.4")).toBeInTheDocument();
  });

  it("sem séries suficientes, não mostra nada", async () => {
    mocks.montarSecaoSeries.mockResolvedValue(null);
    const { container } = await renderizar();
    expect(container).toBeEmptyDOMElement();
  });

  it("com erro do TMDB, mostra o 'Tentar de novo' com a rodada atual", async () => {
    mocks.montarSecaoSeries.mockResolvedValue({ ...secao, filmes: [], erro: true });
    await renderizar();
    expect(screen.getByRole("link", { name: "Tentar de novo" })).toHaveAttribute(
      "href",
      "/dashboard?rodada=2",
    );
  });
});

describe("EsqueletoSecoes", () => {
  it("mostra 3 seções por padrão e uma só com secoes={1}", () => {
    const { container, rerender } = render(<EsqueletoSecoes />);
    const secoes = () => container.querySelectorAll('[aria-busy="true"] > div');
    expect(secoes()).toHaveLength(3);
    rerender(<EsqueletoSecoes secoes={1} />);
    expect(secoes()).toHaveLength(1);
  });
});
