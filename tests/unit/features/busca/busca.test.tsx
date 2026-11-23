import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BuscaPage, { generateMetadata } from "@/app/(app)/busca/page";
import { AbasTipo } from "@/features/busca/components/formularios-busca";
import { Paginacao } from "@/features/busca/components/paginacao";
import { ResultadosBusca } from "@/features/busca/components/resultados-busca";
import { filtrosParaDescoberta, lerBusca, parametrosDaBusca } from "@/features/busca/parametros";
import { obterFiltro } from "@/features/filtro-conteudo/consultas";
import { buscarFilmes, classificacaoFilme, descobrirFilmes } from "@/lib/tmdb/filmes";
import { buscarSeries, classificacaoSerie } from "@/lib/tmdb/series";
import type { FilmeResumo, Pagina } from "@/lib/tmdb/tipos";

vi.mock("@/lib/tmdb/filmes", () => ({
  buscarFilmes: vi.fn(),
  descobrirFilmes: vi.fn(),
  classificacaoFilme: vi.fn(),
}));
vi.mock("@/lib/tmdb/series", () => ({ buscarSeries: vi.fn(), classificacaoSerie: vi.fn() }));
vi.mock("@/features/filtro-conteudo/consultas", () => ({ obterFiltro: vi.fn(async () => null) }));

function filme(id: number): FilmeResumo {
  return {
    id,
    titulo: `Matrix ${id}`,
    tituloOriginal: `Matrix ${id}`,
    sinopse: "",
    posterPath: null,
    backdropPath: null,
    generos: [878],
    ano: 1999,
    nota: 8.2,
    votos: 100,
    popularidade: 10,
  };
}

const pagina = (
  itens: FilmeResumo[],
  totalResultados: number,
  totalPaginas = 1,
): Pagina<FilmeResumo> => ({ itens, pagina: 1, totalPaginas, totalResultados });

const hoje = new Date("2026-10-05T12:00:00Z");

describe("lerBusca", () => {
  it("normaliza o texto", () => {
    expect(lerBusca({ q: "  clube   da luta " }).texto).toBe("clube da luta");
    expect(lerBusca({ q: "a".repeat(150) }).texto).toHaveLength(100);
    expect(lerBusca({}).texto).toBe("");
    expect(lerBusca({ q: ["a", "b"] }).texto).toBe("");
  });

  it("lê a página entre 1 e 500", () => {
    expect(lerBusca({ pagina: "2" }).pagina).toBe(2);
    for (const valor of ["0", "-1", "abc", "501", undefined]) {
      expect(lerBusca({ pagina: valor }).pagina).toBe(1);
    }
  });

  it("só entra no modo filtros com modo=filtros", () => {
    expect(lerBusca({ modo: "filtros" }).modo).toBe("filtros");
    expect(lerBusca({ modo: "outro" }).modo).toBe("nome");
    expect(lerBusca({}).modo).toBe("nome");
  });

  it("lê tipo=serie; ausente, inválido ou no modo filtros é filme", () => {
    expect(lerBusca({ q: "dark", tipo: "serie" }).tipo).toBe("serie");
    for (const tipo of [undefined, "filme", "outro", ["serie", "filme"]]) {
      expect(lerBusca({ q: "dark", tipo }).tipo).toBe("filme");
    }
    expect(lerBusca({ modo: "filtros", tipo: "serie" }).tipo).toBe("filme");
  });

  it("valida os filtros e aplica os padrões", () => {
    expect(lerBusca({ genero: "18", ano: "2010" }, hoje).filtros).toEqual({
      genero: 18,
      ano: 2010,
      duracao: "indiferente",
      ordem: "popularidade",
    });
    expect(
      lerBusca({ genero: "1", ano: "1500", duracao: "enorme", ordem: "x" }, hoje).filtros,
    ).toEqual({ genero: null, ano: null, duracao: "indiferente", ordem: "popularidade" });
    expect(lerBusca({ ano: "abc" }, hoje).filtros.ano).toBeNull();
    expect(lerBusca({ ano: "2029" }, hoje).filtros.ano).toBeNull();
  });
});

describe("filtrosParaDescoberta", () => {
  it("traduz Drama + 2010 + média + nota para o discover", () => {
    expect(
      filtrosParaDescoberta({ genero: 18, ano: 2010, duracao: "media", ordem: "nota" }, 2),
    ).toEqual({
      generos: [18],
      ano: 2010,
      duracaoMin: 90,
      duracaoMax: 120,
      ordem: "nota",
      votosMin: 200,
      pagina: 2,
    });
  });

  it("sem filtros, lista os populares", () => {
    expect(
      filtrosParaDescoberta(
        { genero: null, ano: null, duracao: "indiferente", ordem: "popularidade" },
        1,
      ),
    ).toEqual({ ordem: "popularidade", pagina: 1 });
  });
});

describe("parametrosDaBusca", () => {
  it("mantém só o necessário para a paginação", () => {
    expect(parametrosDaBusca(lerBusca({ q: "matrix", pagina: "2" }))).toEqual({ q: "matrix" });
    expect(
      parametrosDaBusca(lerBusca({ modo: "filtros", genero: "27", duracao: "curta" }, hoje)),
    ).toEqual({ modo: "filtros", genero: "27", duracao: "curta" });
  });

  it("mantém o tipo só quando é série", () => {
    expect(parametrosDaBusca(lerBusca({ q: "dark", tipo: "serie", pagina: "2" }))).toEqual({
      q: "dark",
      tipo: "serie",
    });
    expect(parametrosDaBusca(lerBusca({ q: "dark", tipo: "filme" }))).toEqual({ q: "dark" });
  });
});

describe("ResultadosBusca", () => {
  const base = { parametros: { q: "matrix" } };

  it("pede um texto quando a busca por nome tem menos de 2 caracteres", () => {
    render(<ResultadosBusca {...base} modo="nome" texto="a" resultado={null} />);
    expect(screen.getByText("Digite o nome de um filme para começar.")).toBeInTheDocument();
  });

  it("mostra a contagem e os cards", () => {
    render(
      <ResultadosBusca
        {...base}
        modo="nome"
        texto="matrix"
        resultado={pagina([filme(1), filme(2)], 1234)}
      />,
    );
    expect(screen.getByText("1.234 resultados para “matrix”")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Matrix 1 (1999)" })).toHaveAttribute(
      "href",
      "/filme/1",
    );
  });

  it("usa o singular com 1 resultado", () => {
    render(
      <ResultadosBusca {...base} modo="nome" texto="matrix" resultado={pagina([filme(1)], 1)} />,
    );
    expect(screen.getByText("1 resultado para “matrix”")).toBeInTheDocument();
  });

  it("avisa quando não há resultados", () => {
    render(<ResultadosBusca {...base} modo="nome" texto="nada" resultado={pagina([], 0, 0)} />);
    expect(screen.getByText("Nenhum filme encontrado para “nada”.")).toBeInTheDocument();
  });

  it("no modo filtros, conta os filmes e avisa quando não há nenhum", () => {
    const { rerender } = render(
      <ResultadosBusca {...base} modo="filtros" texto="" resultado={pagina([filme(1)], 1)} />,
    );
    expect(screen.getByText("1 filme encontrado")).toBeInTheDocument();
    rerender(
      <ResultadosBusca {...base} modo="filtros" texto="" resultado={pagina([filme(1)], 40)} />,
    );
    expect(screen.getByText("40 filmes encontrados")).toBeInTheDocument();
    rerender(<ResultadosBusca {...base} modo="filtros" texto="" resultado={pagina([], 0, 0)} />);
    expect(screen.getByText("Nenhum filme encontrado com esses filtros.")).toBeInTheDocument();
  });
});

describe("ResultadosBusca de séries", () => {
  const base = { parametros: { q: "dark", tipo: "serie" }, modo: "nome" as const };

  it("os cartões levam a /serie/{id} e dizem Série", () => {
    render(
      <ResultadosBusca {...base} tipo="serie" texto="dark" resultado={pagina([filme(7)], 1)} />,
    );
    const cartao = screen.getByRole("link", { name: "Matrix 7 (1999), série" });
    expect(cartao).toHaveAttribute("href", "/serie/7");
    expect(within(cartao).getByText("Série · 1999 · ★ 8.2")).toBeInTheDocument();
  });

  it("sem resultado, a mensagem fala de série", () => {
    render(<ResultadosBusca {...base} tipo="serie" texto="nada" resultado={pagina([], 0, 0)} />);
    expect(screen.getByText("Nenhuma série encontrada para “nada”.")).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum filme/)).not.toBeInTheDocument();
  });
});

describe("AbasTipo", () => {
  it("mantém o texto buscado e marca a aba ativa", () => {
    render(<AbasTipo ativa="serie" texto="guerra dos tronos" />);
    const filmes = screen.getByRole("link", { name: "Filmes" });
    const series = screen.getByRole("link", { name: "Séries" });
    expect(filmes).toHaveAttribute("href", "/busca?q=guerra+dos+tronos");
    expect(series).toHaveAttribute("href", "/busca?q=guerra+dos+tronos&tipo=serie");
    expect(series).toHaveAttribute("aria-current", "page");
    expect(filmes).not.toHaveAttribute("aria-current");
  });

  it("sem texto, os links não levam q", () => {
    render(<AbasTipo ativa="filme" texto="" />);
    expect(screen.getByRole("link", { name: "Filmes" })).toHaveAttribute("href", "/busca");
    expect(screen.getByRole("link", { name: "Séries" })).toHaveAttribute(
      "href",
      "/busca?tipo=serie",
    );
  });
});

describe("BuscaPage", () => {
  beforeEach(() => vi.clearAllMocks());

  const abrir = async (parametros: Record<string, string>) =>
    render(await BuscaPage({ searchParams: Promise.resolve(parametros) } as never));

  it("com tipo=serie, procura séries e mostra as abas Filmes | Séries", async () => {
    vi.mocked(buscarSeries).mockResolvedValueOnce(pagina([filme(7)], 1));
    await abrir({ q: "dark", tipo: "serie" });

    expect(buscarSeries).toHaveBeenCalledWith("dark", 1);
    expect(buscarFilmes).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "Buscar" })).toBeInTheDocument();
    const abas = screen.getByRole("navigation", { name: "Tipo de título" });
    expect(within(abas).getByRole("link", { name: "Séries" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Matrix 7 (1999), série" })).toHaveAttribute(
      "href",
      "/serie/7",
    );
    expect(screen.getByLabelText("Nome da série")).toHaveValue("dark");
  });

  it("no modo Por filtros, só filmes e sem as abas", async () => {
    vi.mocked(descobrirFilmes).mockResolvedValueOnce(pagina([filme(1)], 1));
    await abrir({ modo: "filtros", tipo: "serie" });

    expect(descobrirFilmes).toHaveBeenCalled();
    expect(buscarSeries).not.toHaveBeenCalled();
    expect(screen.queryByRole("navigation", { name: "Tipo de título" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Matrix 1 (1999)" })).toHaveAttribute(
      "href",
      "/filme/1",
    );
  });

  it("sem filtro, a busca por nome não consulta classificação", async () => {
    vi.mocked(buscarFilmes).mockResolvedValueOnce(pagina([filme(1), filme(2)], 2));
    await abrir({ q: "matrix" });
    expect(classificacaoFilme).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Matrix 2 (1999)" })).toBeInTheDocument();
  });

  it("com filtro, o filme +18 some da busca por nome; o sem classificação fica", async () => {
    vi.mocked(obterFiltro).mockResolvedValueOnce("14");
    vi.mocked(buscarFilmes).mockResolvedValueOnce(pagina([filme(1), filme(2), filme(3)], 3));
    vi.mocked(classificacaoFilme).mockImplementation(async (id) =>
      id === 2 ? "18" : id === 3 ? null : "16",
    );
    await abrir({ q: "matrix" });

    expect(screen.getByRole("link", { name: "Matrix 1 (1999)" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Matrix 2 (1999)" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Matrix 3 (1999)" })).toBeInTheDocument();
  });

  it("com filtro, a série +18 também some, e a busca por filtros vai até 16", async () => {
    vi.mocked(obterFiltro).mockResolvedValue("10");
    vi.mocked(buscarSeries).mockResolvedValueOnce(pagina([filme(7), filme(8)], 2));
    vi.mocked(classificacaoSerie).mockImplementation(async (id) => (id === 7 ? "18" : "12"));
    const { unmount } = await abrir({ q: "dark", tipo: "serie" });
    expect(screen.queryByRole("link", { name: "Matrix 7 (1999), série" })).toBeNull();
    expect(screen.getByRole("link", { name: "Matrix 8 (1999), série" })).toBeInTheDocument();
    unmount();

    vi.mocked(descobrirFilmes).mockResolvedValueOnce(pagina([filme(1)], 1));
    await abrir({ modo: "filtros" });
    expect(descobrirFilmes).toHaveBeenCalledWith(
      expect.objectContaining({ classificacaoMax: "16" }),
    );
    vi.mocked(obterFiltro).mockResolvedValue(null);
  });

  it("o título da aba é Buscar sem texto e Busca: {texto} com ele", async () => {
    const titulo = async (parametros: Record<string, string>) =>
      (await generateMetadata({ searchParams: Promise.resolve(parametros) } as never)).title;
    expect(await titulo({})).toBe("Buscar");
    expect(await titulo({ q: "dark", tipo: "serie" })).toBe("Busca: dark");
  });
});

describe("Paginacao", () => {
  it("no meio, tem Anterior e Próxima mantendo os parâmetros", () => {
    render(<Paginacao parametros={{ q: "matrix" }} pagina={2} totalPaginas={3} />);
    expect(screen.getByText("Página 2 de 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Anterior" })).toHaveAttribute(
      "href",
      "/busca?q=matrix&pagina=1",
    );
    expect(screen.getByRole("link", { name: "Próxima" })).toHaveAttribute(
      "href",
      "/busca?q=matrix&pagina=3",
    );
  });

  it("mantém os filtros", () => {
    render(
      <Paginacao parametros={{ modo: "filtros", genero: "27" }} pagina={1} totalPaginas={3} />,
    );
    expect(screen.getByRole("link", { name: "Próxima" })).toHaveAttribute(
      "href",
      "/busca?modo=filtros&genero=27&pagina=2",
    );
  });

  it("na primeira página não há Anterior; na última não há Próxima", () => {
    const { rerender } = render(
      <Paginacao parametros={{ q: "matrix" }} pagina={1} totalPaginas={3} />,
    );
    expect(screen.queryByRole("link", { name: "Anterior" })).not.toBeInTheDocument();
    rerender(<Paginacao parametros={{ q: "matrix" }} pagina={3} totalPaginas={3} />);
    expect(screen.queryByRole("link", { name: "Próxima" })).not.toBeInTheDocument();
  });

  it("não aparece com uma página só", () => {
    const { container } = render(
      <Paginacao parametros={{ q: "matrix" }} pagina={1} totalPaginas={1} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
