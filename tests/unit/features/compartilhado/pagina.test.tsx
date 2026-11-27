import { render, screen, within } from "@testing-library/react";
import { notFound, redirect } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";

import CompartilhadoPage, { generateMetadata } from "@/app/compartilhado/[tipo]/[id]/page";
import { obterUsuarioAtual } from "@/features/auth/sessao";
import { PaginaCompartilhada } from "@/features/compartilhado/components/pagina-compartilhada";
import { obterFilme } from "@/lib/tmdb/filmes";
import { obterSerie } from "@/lib/tmdb/series";

import { filmeCompartilhado, serieCompartilhada } from "./fabrica";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/features/auth/sessao", () => ({ obterUsuarioAtual: vi.fn() }));
vi.mock("@/lib/tmdb/filmes", () => ({ obterFilme: vi.fn() }));
vi.mock("@/lib/tmdb/series", () => ({ obterSerie: vi.fn() }));

afterEach(() => vi.clearAllMocks());

const convite = () => within(screen.getByTestId("acoes-filme"));

describe("PaginaCompartilhada", () => {
  it("mostra o filme: título, duração, selo, sinopse, onde assistir e o convite", () => {
    render(<PaginaCompartilhada compartilhado={filmeCompartilhado()} />);

    expect(screen.getByRole("heading", { level: 1, name: "Matrix" })).toBeInTheDocument();
    expect(screen.getByText("1999")).toBeInTheDocument();
    expect(screen.getByText("2h 5min")).toBeInTheDocument();
    expect(screen.getByTestId("selo-classificacao")).toHaveTextContent("14");
    expect(screen.getByText("Um hacker descobre a verdade sobre a realidade.")).toBeInTheDocument();
    expect(screen.getByText("Direção: Lana Wachowski")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Onde assistir no Brasil" })).toBeInTheDocument();
    expect(screen.getByText("Netflix")).toBeInTheDocument();
    expect(convite().getByRole("link", { name: "Criar conta" })).toHaveAttribute(
      "href",
      "/cadastro",
    );
    expect(convite().getByRole("link", { name: "Entrar" })).toHaveAttribute(
      "href",
      "/login?next=/filme/603",
    );
    // Só leitura: nada de reação nem de lista.
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("corta a sinopse longa", () => {
    const sinopse = `${"palavra ".repeat(60)}fim`;
    render(<PaginaCompartilhada compartilhado={filmeCompartilhado({ sinopse })} />);

    expect(screen.queryByText(/fim$/)).not.toBeInTheDocument();
    expect(screen.getByText(/palavra…$/)).toBeInTheDocument();
  });

  it("mostra a série com a duração do episódio, e o Entrar volta à página da série", () => {
    render(<PaginaCompartilhada compartilhado={serieCompartilhada()} />);

    expect(screen.getByRole("heading", { level: 1, name: "Dark" })).toBeInTheDocument();
    expect(screen.getByText("Episódios de 50min")).toBeInTheDocument();
    expect(screen.getByText("Criação: Baran bo Odar")).toBeInTheDocument();
    expect(convite().getByRole("link", { name: "Entrar" })).toHaveAttribute(
      "href",
      "/login?next=/serie/70523",
    );
  });

  it("+18: nada do título aparece, só o aviso e o convite para entrar", () => {
    const { container } = render(
      <PaginaCompartilhada compartilhado={filmeCompartilhado({ classificacao: "18" })} />,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Título para maiores de 18 anos",
    );
    expect(container).not.toHaveTextContent("Matrix");
    expect(container).not.toHaveTextContent("hacker");
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute(
      "href",
      "/login?next=/filme/603",
    );
  });
});

describe("rota /compartilhado/[tipo]/[id]", () => {
  const props = (tipo: string, id: string) =>
    ({ params: Promise.resolve({ tipo, id }) }) as Parameters<typeof CompartilhadoPage>[0];

  it("sem usuário, mostra a página pública do filme", async () => {
    vi.mocked(obterUsuarioAtual).mockResolvedValue(null);
    vi.mocked(obterFilme).mockResolvedValue(filmeCompartilhado().titulo as never);

    render(await CompartilhadoPage(props("filme", "603")));

    expect(screen.getByRole("heading", { level: 1, name: "Matrix" })).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  it.each([
    ["filme", "/filme/603"],
    ["serie", "/serie/603"],
  ])("com usuário, o %s vai direto à página logada", async (tipo, destino) => {
    vi.mocked(obterUsuarioAtual).mockResolvedValue({ id: "u-1", email: "a@b.c", nome: "Ana" });

    await expect(CompartilhadoPage(props(tipo, "603"))).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(destino);
    expect(obterFilme).not.toHaveBeenCalled();
  });

  it.each([
    ["pessoa", "603"],
    ["filme", "abc"],
  ])("/%s/%s é 404, sem redirecionar nem ir ao TMDB", async (tipo, id) => {
    vi.mocked(obterUsuarioAtual).mockResolvedValue({ id: "u-1", email: "a@b.c", nome: "Ana" });

    await expect(CompartilhadoPage(props(tipo, id))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(redirect).not.toHaveBeenCalled();
    expect(obterFilme).not.toHaveBeenCalled();
  });

  it("título que o TMDB não conhece é 404", async () => {
    vi.mocked(obterUsuarioAtual).mockResolvedValue(null);
    vi.mocked(obterSerie).mockResolvedValue(null);

    await expect(CompartilhadoPage(props("serie", "999000001"))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("os metadados levam o pôster do filme", async () => {
    vi.mocked(obterFilme).mockResolvedValue(filmeCompartilhado().titulo as never);

    const metadados = await generateMetadata(props("filme", "603") as never);

    expect(metadados.title).toBe("Matrix (1999)");
    expect(metadados.openGraph?.images).toEqual([
      expect.objectContaining({ url: "https://image.tmdb.org/t/p/w500/matrix.jpg" }),
    ]);
  });
});
