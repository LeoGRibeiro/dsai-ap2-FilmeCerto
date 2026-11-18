import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ErroNoite from "@/app/(app)/noite/error";
import { enviarEvento } from "@/features/metricas/enviar";
import type { Clima } from "@/features/metricas/eventos";
import { FilmeDestaque, type FilmeNaTela } from "@/features/noite/components/filme-destaque";
import { paraTela, RecomendacaoNoite } from "@/features/noite/components/recomendacao-noite";
import { ResultadoNoite } from "@/features/noite/components/resultado-noite";
import { TerminaAs } from "@/features/noite/components/termina-as";
import { obterNoite } from "@/features/noite/consultas";
import { ESTADO_INICIAL } from "@/features/noite/estado";
import type { FilmeDaNoite } from "@/features/noite/recomendar";
import type { FilmeDetalhes } from "@/lib/tmdb/tipos";

const sessao = vi.hoisted(() => ({ concluir: vi.fn(), marcarEscolha: vi.fn() }));

vi.mock("@/features/metricas/enviar", () => ({ enviarEvento: vi.fn() }));
vi.mock("@/features/noite/consultas", () => ({ obterNoite: vi.fn() }));
vi.mock("@/features/noite/components/sessao-noite", () => ({ useSessaoNoite: () => sessao }));

const NETFLIX = { id: 8, nome: "Netflix", logoPath: null };
const respostas: Clima = { humor: "cansado", experiencia: "rir", companhia: "a-dois" };
const perfil = { generosEvitados: [], streamings: [8] };
const MOTIVO =
  "Você está cansado, quer rir e vai ver a dois: comédia leve, nota 7,8, está na Netflix.";

function naTela(sobrescrever: Partial<FilmeNaTela> = {}): FilmeNaTela {
  return {
    id: 10,
    titulo: "Amor à Primeira Risada",
    ano: 2019,
    posterPath: "/p10.jpg",
    sinopse: "Dois vizinhos brigam por uma vaga.",
    duracaoMin: 115,
    trailerYoutube: "abc123",
    motivo: MOTIVO,
    provedor: NETFLIX,
    ...sobrescrever,
  };
}

function daNoite(id: number): FilmeDaNoite {
  const filme: FilmeDetalhes = {
    ...naTela({ id, titulo: `Filme ${id}` }),
    tituloOriginal: "",
    backdropPath: null,
    generos: [{ id: 35, nome: "Comédia" }],
    nota: 7.8,
    votos: 900,
    popularidade: 1,
    slogan: null,
    elenco: [{ nome: "Atriz", personagem: "Ela", fotoPath: null }],
    direcao: ["Diretora"],
    ondeAssistir: null,
    parecidos: [],
  };
  return { filme, provedor: NETFLIX, motivo: MOTIVO };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("TerminaAs", () => {
  it("soma a duração à hora do navegador e acompanha o relógio", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 18, 21, 45));
    render(<TerminaAs duracaoMin={115} />);

    expect(screen.getByText("Começando agora, termina às 23h40")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(5 * 60_000));
    expect(screen.getByText("Começando agora, termina às 23h45")).toBeInTheDocument();
  });
});

describe("FilmeDestaque", () => {
  it("mostra título, ano e duração, onde assistir, motivo, sinopse e o trailer da noite", async () => {
    render(<FilmeDestaque filme={naTela()} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Amor à Primeira Risada");
    expect(screen.getByText("2019 · 1h 55min")).toBeInTheDocument();
    expect(screen.getByText("Onde assistir: Netflix")).toBeInTheDocument();
    expect(screen.getByText(/^Começando agora, termina às \d{1,2}h\d{2}$/)).toBeInTheDocument();
    expect(screen.getByTestId("motivo-noite")).toHaveTextContent(MOTIVO);
    expect(screen.getByText("Dois vizinhos brigam por uma vaga.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Assistir trailer/ }));
    expect(enviarEvento).toHaveBeenCalledExactlyOnceWith({
      nome: "trailer_aberto",
      dados: { origem: "noite" },
    });
  });

  it("sem duração, trailer, streaming e pôster, mostra só o que tem", () => {
    const filme = naTela({
      duracaoMin: null,
      trailerYoutube: null,
      provedor: null,
      posterPath: null,
    });
    const { container } = render(<FilmeDestaque filme={filme} />);

    expect(screen.getByText("2019")).toBeInTheDocument();
    expect(screen.queryByText(/termina às/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Onde assistir/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /trailer/ })).not.toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("ResultadoNoite", () => {
  it("na primeira rodada, conclui o wizard com as respostas", () => {
    render(<ResultadoNoite respostas={respostas} trocas={0} destaque={naTela()} />);

    expect(sessao.concluir).toHaveBeenCalledExactlyOnceWith(respostas);
  });

  it("depois de uma troca, não conclui de novo", () => {
    render(<ResultadoNoite respostas={respostas} trocas={1} destaque={naTela()} />);

    expect(sessao.concluir).not.toHaveBeenCalled();
  });
});

describe("RecomendacaoNoite", () => {
  beforeEach(() => {
    vi.mocked(obterNoite).mockResolvedValue(null);
  });

  it("busca a rodada com as respostas, o estado e o perfil, e mostra o destaque", async () => {
    vi.mocked(obterNoite).mockResolvedValue({ destaque: daNoite(10), opcoes: [] });

    render(await RecomendacaoNoite({ respostas, estado: ESTADO_INICIAL, perfil }));

    expect(obterNoite).toHaveBeenCalledExactlyOnceWith(respostas, ESTADO_INICIAL, perfil);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Filme 10");
  });

  it("sem filme, diz que não achou nada e oferece refazer as perguntas", async () => {
    render(await RecomendacaoNoite({ respostas, estado: ESTADO_INICIAL, perfil }));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Não achamos nada para essa noite",
    );
    expect(screen.getByRole("link", { name: "Refazer as perguntas" })).toHaveAttribute(
      "href",
      "/noite",
    );
  });

  it("deixa o erro do TMDB subir para a página de erro", async () => {
    vi.mocked(obterNoite).mockRejectedValue(new Error("TMDB fora"));

    await expect(RecomendacaoNoite({ respostas, estado: ESTADO_INICIAL, perfil })).rejects.toThrow(
      "TMDB fora",
    );
  });

  it("manda ao navegador só os campos da tela", () => {
    expect(paraTela(daNoite(10))).toEqual(naTela({ titulo: "Filme 10" }));
  });
});

describe("ErroNoite", () => {
  it("oferece tentar de novo e voltar ao início", async () => {
    const retry = vi.fn();
    render(<ErroNoite error={new Error("x")} retry={retry} />);

    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Ir para o início" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});
