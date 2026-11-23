import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CartaoFilme } from "@/features/dashboard/components/cartao-filme";
import { Cabecalho, CabecalhoFilme } from "@/features/filme/components/cabecalho-filme";
import { Elenco } from "@/features/filme/components/elenco";
import { ErroAoCarregar } from "@/features/filme/components/erro-ao-carregar";
import { OndeAssistir } from "@/features/filme/components/onde-assistir";
import { Trailer } from "@/features/filme/components/trailer";
import {
  formatarDuracao,
  formatarNota,
  formatarVotos,
  tituloComAno,
} from "@/features/filme/formatar";
import { AcoesTitulo, Sinopse } from "@/features/filme/components/pagina-titulo";
import { buscaPorId, lerId } from "@/features/filme/ler-id";
import { enviarEvento } from "@/features/metricas/enviar";
import type { FilmeDetalhes } from "@/lib/tmdb/tipos";

vi.mock("@/features/metricas/enviar", () => ({ enviarEvento: vi.fn() }));
vi.mock("@/features/reacoes/actions", () => ({ alternarReacao: vi.fn() }));
vi.mock("@/features/listas/actions", () => ({ alternarLista: vi.fn() }));

function detalhes(sobrescrever: Partial<FilmeDetalhes> = {}): FilmeDetalhes {
  return {
    id: 550,
    titulo: "Clube da Luta",
    tituloOriginal: "Fight Club",
    sinopse: "Um homem deprimido...",
    posterPath: null,
    backdropPath: null,
    generos: [
      { id: 18, nome: "Drama" },
      { id: 53, nome: "Thriller" },
    ],
    ano: 1999,
    nota: 8.44,
    votos: 30000,
    popularidade: 70,
    duracaoMin: 139,
    slogan: "Mischief. Mayhem. Soap.",
    trailerYoutube: "abc123",
    elenco: [],
    direcao: ["David Fincher"],
    ondeAssistir: null,
    parecidos: [],
    classificacao: null,
    ...sobrescrever,
  };
}

describe("formatar", () => {
  it.each([
    [139, "2h 19min"],
    [120, "2h"],
    [45, "45min"],
    [null, null],
    [0, null],
  ])("formatarDuracao(%j) = %j", (minutos, texto) => {
    expect(formatarDuracao(minutos)).toBe(texto);
  });

  it("formatarVotos usa o separador de milhar pt-BR", () => {
    expect(formatarVotos(30000)).toBe("30.000");
  });

  it("formatarNota mostra a nota com uma casa e os votos", () => {
    expect(formatarNota(8.44, 30000)).toBe("★ 8.4 (30.000 votos)");
  });

  it("tituloComAno omite o ano ausente", () => {
    expect(tituloComAno({ titulo: "Clube da Luta", ano: 1999 })).toBe("Clube da Luta (1999)");
    expect(tituloComAno({ titulo: "Clube da Luta", ano: null })).toBe("Clube da Luta");
  });
});

describe("lerId", () => {
  it.each([
    ["550", 550],
    ["0001399", 1399],
    ["9999999999", 9999999999],
  ])("aceita %j", (valor, id) => {
    expect(lerId(valor)).toBe(id);
  });

  it.each(["0", "abc", "-5", "1.5", "12345678901", ""])("recusa %j", (valor) => {
    expect(lerId(valor)).toBeNull();
  });
});

describe("buscaPorId", () => {
  it("busca o ID válido e devolve null sem buscar o inválido", async () => {
    const obter = vi.fn(async (id: number) => ({ id }));
    const buscar = buscaPorId(obter);

    expect(await buscar("1399")).toEqual({ id: 1399 });
    expect(await buscar("abc")).toBeNull();
    expect(obter).toHaveBeenCalledExactlyOnceWith(1399);
  });
});

describe("Sinopse", () => {
  it("mostra o texto e quem fez", () => {
    render(<Sinopse texto="Uma família..." rotulo="Criação" nomes={["Ana", "Bia"]} />);
    expect(screen.getByRole("heading", { name: "Sinopse" })).toBeInTheDocument();
    expect(screen.getByText("Uma família...")).toBeInTheDocument();
    expect(screen.getByText("Criação: Ana, Bia")).toBeInTheDocument();
  });

  it("sem texto nem nomes, avisa e omite a linha de créditos", () => {
    render(<Sinopse texto="" rotulo="Direção" nomes={[]} />);
    expect(screen.getByText("Sinopse não disponível em português.")).toBeInTheDocument();
    expect(screen.queryByText(/Direção/)).not.toBeInTheDocument();
  });
});

describe("AcoesTitulo", () => {
  it("passa o tipo e os valores atuais aos botões de reação e de lista", () => {
    const { container } = render(
      <AcoesTitulo midia={{ tipo: "serie", tmdbId: 1399 }} reacao="amei" statusLista={null} />,
    );
    const tipos = [...container.querySelectorAll<HTMLInputElement>('input[name="tipo"]')];
    expect(tipos.map((campo) => campo.value)).toEqual(Array(5).fill("serie"));
    expect(screen.getByRole("button", { name: "Amei" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Quero assistir" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

describe("Cabecalho", () => {
  it("mostra os itens da linha de dados e omite os nulos", () => {
    render(<Cabecalho titulo={detalhes()} dados={["2019", null, "2 temporadas"]} />);
    const linha = screen.getByText("2019").closest("ul");
    expect(linha?.querySelectorAll("li")).toHaveLength(2);
    expect(screen.getByText("2 temporadas")).toBeInTheDocument();
  });
});

describe("ErroAoCarregar", () => {
  it("mostra a frase recebida e tenta de novo no clique", async () => {
    const usuario = userEvent.setup();
    const retry = vi.fn();
    render(<ErroAoCarregar titulo="Não foi possível carregar esta série agora." retry={retry} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Não foi possível carregar esta série agora.",
    );
    expect(screen.getByRole("link", { name: "Voltar ao início" })).toHaveAttribute(
      "href",
      "/dashboard",
    );

    await usuario.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(retry).toHaveBeenCalledOnce();
  });
});

describe("CabecalhoFilme", () => {
  it("mostra título, título original, ano, duração, nota, gêneros e slogan", () => {
    render(<CabecalhoFilme filme={detalhes()} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Clube da Luta");
    expect(screen.getByText("Fight Club")).toBeInTheDocument();
    expect(screen.getByText("1999")).toBeInTheDocument();
    expect(screen.getByText("2h 19min")).toBeInTheDocument();
    expect(screen.getByText("★ 8.4 (30.000 votos)")).toBeInTheDocument();
    expect(screen.getByText("Drama")).toBeInTheDocument();
    expect(screen.getByText("Thriller")).toBeInTheDocument();
    expect(screen.getByText("Mischief. Mayhem. Soap.")).toBeInTheDocument();
    expect(screen.getByTestId("acoes-filme")).toBeInTheDocument();
  });

  it("omite o título original quando é igual ao título", () => {
    render(<CabecalhoFilme filme={detalhes({ tituloOriginal: "Clube da Luta" })} />);
    expect(screen.getAllByText("Clube da Luta")).toHaveLength(2); // h1 + bloco sem pôster
  });
});

describe("OndeAssistir", () => {
  it("mostra os grupos, o link e o aviso da JustWatch, omitindo grupo vazio", () => {
    render(
      <OndeAssistir
        dados={{
          link: "https://www.themoviedb.org/movie/550/watch?locale=BR",
          assinatura: [{ id: 8, nome: "Netflix", logoPath: "/n.jpg" }],
          aluguel: [{ id: 2, nome: "Apple TV", logoPath: null }],
          compra: [],
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Assinatura" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Aluguel" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Compra" })).not.toBeInTheDocument();
    expect(screen.getByText("Netflix")).toBeInTheDocument();
    expect(screen.getByText("Apple TV")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Ver todas as opções/ });
    expect(link).toHaveAttribute("href", "https://www.themoviedb.org/movie/550/watch?locale=BR");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(
      screen.getByText("Dados de onde assistir fornecidos por JustWatch."),
    ).toBeInTheDocument();
  });

  it("sem dados, avisa que não encontrou", () => {
    render(<OndeAssistir dados={null} />);
    expect(
      screen.getByText("Não encontramos onde assistir este filme no Brasil."),
    ).toBeInTheDocument();
  });

  it("sem dados de uma série, fala da série", () => {
    render(<OndeAssistir dados={null} tipo="serie" />);
    expect(
      screen.getByText("Não encontramos onde assistir esta série no Brasil."),
    ).toBeInTheDocument();
  });
});

describe("Trailer", () => {
  it("só cria o player depois do clique", async () => {
    const usuario = userEvent.setup();
    const { container } = render(<Trailer chave="abc123" titulo="Clube da Luta" />);
    expect(container.querySelector("iframe")).toBeNull();

    await usuario.click(screen.getByRole("button", { name: "Assistir trailer" }));

    const iframe = screen.getByTitle("Trailer de Clube da Luta");
    expect(iframe.getAttribute("src")).toContain("https://www.youtube-nocookie.com/embed/abc123");
  });

  describe("evento trailer_aberto", () => {
    afterEach(() => {
      vi.mocked(enviarEvento).mockClear();
    });

    it("registra o clique com a origem informada", async () => {
      const usuario = userEvent.setup();
      render(<Trailer chave="abc123" titulo="Clube da Luta" origem="filme" />);
      expect(enviarEvento).not.toHaveBeenCalled();

      await usuario.click(screen.getByRole("button", { name: "Assistir trailer" }));

      expect(enviarEvento).toHaveBeenCalledExactlyOnceWith({
        nome: "trailer_aberto",
        dados: { origem: "filme" },
      });
    });

    it("não registra nada sem origem", async () => {
      const usuario = userEvent.setup();
      render(<Trailer chave="abc123" titulo="Clube da Luta" />);

      await usuario.click(screen.getByRole("button", { name: "Assistir trailer" }));

      expect(enviarEvento).not.toHaveBeenCalled();
    });
  });
});

describe("Elenco", () => {
  it("mostra nome e personagem, com iniciais quando não há foto", () => {
    render(
      <Elenco
        pessoas={[
          { nome: "Brad Pitt", personagem: "Tyler Durden", fotoPath: "/b.jpg" },
          { nome: "Edward Norton", personagem: "Narrador", fotoPath: null },
        ]}
      />,
    );
    expect(screen.getByText("Brad Pitt")).toBeInTheDocument();
    expect(screen.getByText("Tyler Durden")).toBeInTheDocument();
    expect(screen.getByText("EN")).toBeInTheDocument();
  });
});

describe("CartaoFilme sem motivo", () => {
  it("não renderiza a linha de motivo", () => {
    const semMotivo = { ...detalhes(), generos: [18] };
    render(<CartaoFilme filme={semMotivo} />);
    expect(screen.queryByTestId("motivo")).not.toBeInTheDocument();
  });
});
