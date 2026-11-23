import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Cabecalho } from "@/features/filme/components/cabecalho-filme";
import { Temporadas } from "@/features/serie/components/temporadas";
import {
  contar,
  dadosDaSerie,
  proximoEpisodio,
  rotuloClassificacao,
  rotuloSituacao,
} from "@/features/serie/formatar";
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
    situacao: "Ended",
    proximoEpisodio: null,
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

  it("dadosDaSerie mostra ano, temporadas, situação, episódio e nota (o selo vem à parte)", () => {
    expect(dadosDaSerie(serie())).toEqual([
      "2011",
      "2 temporadas",
      "Encerrada",
      "Episódios de 57min",
      "★ 8.5 (25.000 votos)",
    ]);
  });

  it("dadosDaSerie deixa nulo o que falta e usa o singular", () => {
    const [primeira] = serie().temporadas;
    expect(
      dadosDaSerie(
        serie({
          ano: null,
          temporadas: [primeira],
          situacao: "Pilot",
          duracaoEpisodioMin: null,
          classificacao: null,
        }),
      ),
    ).toEqual([null, "1 temporada", null, null, "★ 8.5 (25.000 votos)"]);
    expect(dadosDaSerie(serie({ temporadas: [], duracaoEpisodioMin: 75 }))[1]).toBeNull();
    expect(dadosDaSerie(serie({ duracaoEpisodioMin: 75 }))[3]).toBe("Episódios de 1h 15min");
  });

  it.each([
    ["Returning Series", "Em exibição"],
    ["Ended", "Encerrada"],
    ["Canceled", "Cancelada"],
    ["In Production", "Em produção"],
    ["Planned", "Em produção"],
    ["Pilot", null],
    [null, null],
    [undefined, null],
  ])("rotuloSituacao(%j) = %j", (status, rotulo) => {
    expect(rotuloSituacao(status)).toBe(rotulo);
  });

  it("proximoEpisodio aparece só com data depois de hoje", () => {
    const hoje = "2026-11-19";
    expect(proximoEpisodio(serie({ proximoEpisodio: "2026-12-12" }), hoje)).toBe(
      "Próximo episódio em 12/12/2026",
    );
    expect(proximoEpisodio(serie({ proximoEpisodio: "2026-11-20" }), hoje)).toBe(
      "Próximo episódio em 20/11/2026",
    );
    for (const data of ["2026-11-19", "2026-01-01", null, undefined]) {
      expect(proximoEpisodio(serie({ proximoEpisodio: data }), hoje)).toBeNull();
    }
  });
});

describe("Temporadas", () => {
  it("mostra nome, ano, episódios e tempo de cada temporada, na ordem, com link", () => {
    render(<Temporadas serieId={1399} temporadas={serie().temporadas} duracaoEpisodioMin={45} />);
    const itens = screen.getAllByRole("listitem");
    expect(itens).toHaveLength(2);
    expect(within(itens[0]).getByText("Temporada 1")).toBeInTheDocument();
    // 10 × 45 min = 7h 30min.
    expect(
      within(itens[0]).getByText("2011 · 10 episódios · cerca de 7h 30min"),
    ).toBeInTheDocument();
    expect(within(itens[0]).getByRole("link")).toHaveAttribute("href", "/serie/1399/temporada/1");
    expect(within(itens[1]).getByRole("link")).toHaveAttribute("href", "/serie/1399/temporada/2");
    expect(itens[0].querySelector("img")?.getAttribute("src")).toContain("t1.jpg");
    expect(within(itens[1]).getByText("Temporada 2")).toBeInTheDocument();
    expect(within(itens[1]).getByText("1 episódio · cerca de 45min")).toBeInTheDocument();
    // Sem pôster, o número da temporada no lugar.
    expect(within(itens[1]).getByText("2")).toBeInTheDocument();
  });

  it("sem a duração do episódio, não mostra o tempo", () => {
    render(<Temporadas serieId={1} temporadas={serie().temporadas} duracaoEpisodioMin={null} />);
    expect(screen.getByText("2011 · 10 episódios")).toBeInTheDocument();
    expect(screen.queryByText(/cerca de/)).toBeNull();
  });
});

describe("Cabecalho da série", () => {
  it("mostra a situação na linha de dados e o próximo episódio abaixo dela", () => {
    const dados = serie({ situacao: "Returning Series", proximoEpisodio: "2026-12-12" });
    render(
      <Cabecalho
        titulo={dados}
        dados={dadosDaSerie(dados)}
        aviso={proximoEpisodio(dados, "2026-11-19")}
      />,
    );
    expect(screen.getByText("Em exibição")).toBeInTheDocument();
    expect(screen.getByText("Próximo episódio em 12/12/2026")).toBeInTheDocument();
  });

  it("sem próximo episódio futuro, não mostra o aviso", () => {
    const dados = serie({ proximoEpisodio: "2026-01-01" });
    render(
      <Cabecalho
        titulo={dados}
        dados={dadosDaSerie(dados)}
        aviso={proximoEpisodio(dados, "2026-11-19")}
      />,
    );
    expect(screen.queryByText(/Próximo episódio/)).toBeNull();
    expect(screen.getByText("Encerrada")).toBeInTheDocument();
  });
});
