import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { escolherFilme } from "@/features/como-foi/actions";
import type { FilmeNaTela } from "@/features/noite/components/filme-destaque";
import { PerguntaNoite } from "@/features/noite/components/pergunta-noite";
import { ResultadoSala } from "@/features/noite/components/resultado-sala";
import { SalaIndisponivel } from "@/features/noite/components/sala-indisponivel";
import { ESTADO_INICIAL, urlComResposta } from "@/features/noite/estado";
import { PERGUNTAS } from "@/features/noite/opcoes";

vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }));
vi.mock("@/features/metricas/enviar", () => ({ enviarEvento: vi.fn() }));
vi.mock("@/features/como-foi/actions", () => ({ escolherFilme: vi.fn(async () => ({})) }));

const SALA = "5b0f3c9e-6a1d-4c51-9a8e-2f4d1c7b9e10";
const MOTIVO =
  "Um quer rir e o outro quer ficar tenso: comédia de ação, nota 7,1, está na Netflix.";

function naTela(id: number): FilmeNaTela {
  return {
    id,
    titulo: `Filme ${id}`,
    ano: 2020,
    posterPath: null,
    sinopse: "",
    duracaoMin: 100,
    trailerYoutube: null,
    motivo: MOTIVO,
    provedor: null,
  };
}

afterEach(() => vi.clearAllMocks());

describe("perguntas na rota da sala", () => {
  it("os cartões levam à URL da sala com a resposta", () => {
    const rota = `/noite/juntos/${SALA}`;
    expect(urlComResposta(ESTADO_INICIAL, "humor", "cansado", rota)).toBe(`${rota}?humor=cansado`);
    expect(urlComResposta(ESTADO_INICIAL, "humor", "cansado")).toBe("/noite?humor=cansado");
  });
});

describe("perguntas da sala", () => {
  it("a sala é só de filmes: sem 'Filme ou série?', e os cartões ficam na sala", () => {
    const rota = `/noite/juntos/${SALA}`;
    render(<PerguntaNoite estado={ESTADO_INICIAL} pergunta={PERGUNTAS[0]} rota={rota} />);

    expect(screen.queryByRole("group", { name: "Filme ou série?" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cansado" })).toHaveAttribute(
      "href",
      `${rota}?humor=cansado`,
    );
  });

  it("no wizard sozinho, a 1ª pergunta continua com 'Filme ou série?'", () => {
    render(<PerguntaNoite estado={ESTADO_INICIAL} pergunta={PERGUNTAS[0]} />);
    expect(screen.getByRole("group", { name: "Filme ou série?" })).toBeInTheDocument();
  });
});

describe("ResultadoSala", () => {
  it("mostra o destaque com o motivo e as 2 opções; depois da escolha, só o escolhido", async () => {
    render(<ResultadoSala filmes={[naTela(1), naTela(2), naTela(3)]} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Filme 1");
    expect(screen.getByTestId("motivo-noite")).toHaveTextContent(MOTIVO);
    const opcoes = screen.getByRole("region", { name: "Ou talvez" });
    expect(within(opcoes).getAllByRole("heading", { level: 3 })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Vou ver esse!" })).toHaveLength(3);

    const segunda = screen.getByRole("article", { name: "Filme 2" });
    await userEvent.click(within(segunda).getByRole("button", { name: "Vou ver esse!" }));

    expect(escolherFilme).toHaveBeenCalledWith(2, "filme");
    expect(await within(segunda).findByText(/Boa sessão!/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Vou ver esse!" })).not.toBeInTheDocument();
  });

  it("sem filme, diz que não achou nada para os dois e oferece escolher sozinho", () => {
    render(<ResultadoSala filmes={[]} />);
    expect(screen.getByRole("heading")).toHaveTextContent(
      "Não achamos um filme que agrade aos dois",
    );
    expect(screen.getByRole("link", { name: "Escolher sozinho" })).toHaveAttribute(
      "href",
      "/noite",
    );
  });
});

describe("SalaIndisponivel", () => {
  it.each([
    ["cheia", "Essa sala já tem duas pessoas"],
    ["expirada", "Essa sala expirou"],
    ["inexistente", "Essa sala não existe"],
  ] as const)("sala %s explica o motivo", (motivo, titulo) => {
    render(<SalaIndisponivel motivo={motivo} />);
    expect(screen.getByRole("heading")).toHaveTextContent(titulo);
    expect(screen.getByRole("link", { name: "Escolher sozinho" })).toHaveAttribute(
      "href",
      "/noite",
    );
  });
});
