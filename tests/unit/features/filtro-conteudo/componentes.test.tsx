import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CabecalhoFilme } from "@/features/filme/components/cabecalho-filme";
import {
  AvisoClassificacao,
  textoDoAviso,
} from "@/features/filtro-conteudo/components/aviso-classificacao";
import { SeloClassificacao } from "@/features/filtro-conteudo/components/selo-classificacao";
import { TituloBloqueado } from "@/features/filtro-conteudo/components/titulo-bloqueado";
import type { FilmeDetalhes } from "@/lib/tmdb/tipos";

function filme(sobrescrever: Partial<FilmeDetalhes> = {}): FilmeDetalhes {
  return {
    id: 1008042,
    titulo: "Jogos Mortais X",
    tituloOriginal: "Saw X",
    sinopse: "",
    posterPath: "/poster.jpg",
    backdropPath: "/fundo.jpg",
    generos: [],
    ano: 2023,
    nota: 7.1,
    votos: 2551,
    popularidade: 1,
    duracaoMin: 118,
    slogan: null,
    trailerYoutube: null,
    elenco: [],
    direcao: [],
    ondeAssistir: null,
    parecidos: [],
    classificacao: "18",
    ...sobrescrever,
  };
}

describe("SeloClassificacao", () => {
  it("mostra a classificação e diz por extenso para leitores de tela", () => {
    render(<SeloClassificacao classificacao="14" />);
    const selo = screen.getByTestId("selo-classificacao");
    expect(selo).toHaveTextContent("14");
    expect(within(selo).getByText("Classificação: 14 anos")).toHaveClass("sr-only");
  });

  it("Livre aparece como L e é lido como Livre", () => {
    render(<SeloClassificacao classificacao="L" />);
    expect(screen.getByText("Classificação: Livre")).toBeInTheDocument();
  });

  it("sem classificação, não aparece", () => {
    const { container } = render(<SeloClassificacao classificacao={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("CabecalhoFilme", () => {
  it("põe o selo depois da nota, na mesma linha de dados", () => {
    render(<CabecalhoFilme filme={filme()} />);
    const itens = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(itens).toEqual([
      "2023",
      "·1h 58min",
      "·★ 7.1 (2.551 votos)",
      "·18Classificação: 18 anos",
    ]);
  });

  it("mostra os temas do Brasil sem nota de origem", () => {
    render(
      <CabecalhoFilme filme={filme({ temas: { temas: ["violencia", "medo"], pais: "BR" } })} />,
    );
    expect(screen.getByTestId("temas-classificacao")).toHaveTextContent(/^Temas: violência, medo$/);
  });

  it("temas de outro país dizem de onde vêm", () => {
    render(<CabecalhoFilme filme={filme({ temas: { temas: ["linguagem"], pais: "NL" } })} />);
    expect(screen.getByTestId("temas-classificacao")).toHaveTextContent(
      "Temas: linguagem imprópria (segundo a classificação da Holanda)",
    );
  });

  it("sem temas, a linha não aparece", () => {
    render(<CabecalhoFilme filme={filme({ temas: null })} />);
    expect(screen.queryByTestId("temas-classificacao")).not.toBeInTheDocument();
  });

  it("sem classificação, a linha termina na nota", () => {
    render(<CabecalhoFilme filme={filme({ classificacao: null })} />);
    expect(screen.queryByTestId("selo-classificacao")).not.toBeInTheDocument();
  });
});

describe("AvisoClassificacao", () => {
  it("diz para que idade o título não é recomendado e leva ao filtro", () => {
    render(<AvisoClassificacao classificacao="16" />);
    const aviso = screen.getByRole("note");
    expect(aviso).toHaveTextContent("Não recomendado para menores de 16 anos.");
    expect(within(aviso).getByRole("link", { name: "Ver o filtro" })).toHaveAttribute(
      "href",
      "/perfil#conteudo-sensivel",
    );
  });

  it("repete os temas, quando há", () => {
    render(<AvisoClassificacao classificacao="16" temas={{ temas: ["drogas"], pais: "DE" }} />);
    expect(screen.getByRole("note")).toHaveTextContent(
      "Não recomendado para menores de 16 anos. Temas: drogas.",
    );
  });

  it("sem classificação, diz que o título não tem classificação", () => {
    expect(textoDoAviso(null)).toBe("Este título não tem classificação indicativa.");
  });
});

describe("TituloBloqueado", () => {
  it("não mostra nome nem imagem, só o bloqueio e o caminho para o filtro", () => {
    const { container } = render(<TituloBloqueado />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Título indisponível");
    expect(screen.getByRole("link", { name: "Mudar o filtro no perfil" })).toHaveAttribute(
      "href",
      "/perfil#conteudo-sensivel",
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container).not.toHaveTextContent("Jogos Mortais");
  });
});
