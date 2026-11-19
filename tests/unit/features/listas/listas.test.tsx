import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { lerAba } from "@/features/listas/aba";
import { AbasListas } from "@/features/listas/components/abas-listas";
import { BotoesLista } from "@/features/listas/components/botoes-lista";
import { GradeFilmes } from "@/features/listas/components/grade-filmes";
import type { ItemLista } from "@/features/listas/consultas";
import { listaSchema } from "@/features/listas/schema";

vi.mock("@/features/listas/actions", () => ({ alternarLista: vi.fn(async () => ({})) }));

function item(tmdbId: number, sobrescrever: Partial<ItemLista> = {}): ItemLista {
  return {
    tipo: "filme",
    tmdbId,
    status: "assistido",
    titulo: `Filme ${tmdbId}`,
    posterPath: null,
    ano: 2020,
    reacao: null,
    ...sobrescrever,
  };
}

describe("listaSchema", () => {
  it.each(["quero_assistir", "assistido"])("aceita %s", (status) => {
    expect(listaSchema.safeParse({ tmdbId: 550, status }).success).toBe(true);
  });

  it("sem tipo é filme, e aceita série", () => {
    expect(listaSchema.parse({ tmdbId: 550, status: "assistido" }).tipo).toBe("filme");
    expect(listaSchema.parse({ tipo: "serie", tmdbId: 1, status: "assistido" }).tipo).toBe("serie");
  });

  it.each([
    { tipo: "anime", tmdbId: 550, status: "assistido" },
    { tmdbId: 550, status: "favorito" },
    { tmdbId: 0, status: "assistido" },
    { tmdbId: 2.5, status: "assistido" },
  ])("rejeita %j", (dados) => {
    expect(listaSchema.safeParse(dados).success).toBe(false);
  });
});

describe("lerAba", () => {
  it("reconhece a aba de assistidos", () => {
    expect(lerAba("assistidos")).toBe("assistidos");
  });

  it.each([undefined, "", "quero", "outra", ["assistidos", "x"]])("%j vira 'quero'", (valor) => {
    expect(lerAba(valor)).toBe("quero");
  });
});

/** Valores do campo `tipo` dos formulários dos botões. */
function tiposEnviados(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLInputElement>('input[name="tipo"]')].map((i) => i.value);
}

describe("BotoesLista", () => {
  it("envia o tipo recebido e filme sem ele", () => {
    const serie = render(<BotoesLista tmdbId={1399} atual={null} tipo="serie" />);
    expect(tiposEnviados(serie.container)).toEqual(["serie", "serie"]);
    serie.unmount();

    const filme = render(<BotoesLista tmdbId={550} atual={null} />);
    expect(tiposEnviados(filme.container)).toEqual(["filme", "filme"]);
  });

  it("mostra os 2 botões e marca só o status atual", () => {
    render(<BotoesLista tmdbId={550} atual="quero_assistir" />);
    expect(screen.getByRole("group", { name: "Minhas listas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quero assistir" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Já assisti" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

describe("AbasListas", () => {
  it("mostra as contagens e marca a aba ativa", () => {
    render(<AbasListas ativa="assistidos" contagem={{ quero: 3, assistidos: 1 }} />);
    expect(screen.getByRole("link", { name: "Quero assistir (3)" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: "Já assisti (1)" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

describe("GradeFilmes", () => {
  it("mostra a reação dada ao filme quando existe", () => {
    render(<GradeFilmes aba="assistidos" itens={[item(1, { reacao: "amei" }), item(2)]} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Amei")).toBeInTheDocument();
  });

  it("filme e série de mesmo ID levam cada um à sua página, e a série diz 'Série'", () => {
    render(
      <GradeFilmes
        aba="quero"
        itens={[item(1399, { tipo: "serie", titulo: "Série 1399" }), item(1399)]}
      />,
    );
    const serie = screen.getByRole("link", { name: "Série 1399 (2020), série" });
    expect(serie).toHaveAttribute("href", "/serie/1399");
    expect(serie).toHaveTextContent("Série · 2020");
    const filme = screen.getByRole("link", { name: "Filme 1399 (2020)" });
    expect(filme).toHaveAttribute("href", "/filme/1399");
    expect(filme).not.toHaveTextContent("Série");
  });

  it("mostra a mensagem de vazio", () => {
    render(<GradeFilmes aba="quero" itens={[]} />);
    expect(screen.getByText(/Nada por aqui ainda/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver recomendações" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});
