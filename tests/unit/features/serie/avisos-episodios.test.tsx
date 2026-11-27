import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { classificarMidia } from "@/features/filtro-conteudo/classificar";
import { marcarAvisoLido } from "@/features/serie/actions";
import type { AvisoEpisodio } from "@/features/serie/avisos";
import { AvisosEpisodios } from "@/features/serie/components/avisos-episodios";
import { CartaoAvisos } from "@/features/serie/components/cartao-avisos";
import { obterAvisosNaoLidos } from "@/features/serie/consultas";
import { gerarAvisos } from "@/features/serie/gravar";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/features/serie/actions", () => ({ marcarAvisoLido: vi.fn(async () => ({})) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/features/serie/gravar", () => ({ gerarAvisos: vi.fn() }));
vi.mock("@/features/serie/consultas", () => ({ obterAvisosNaoLidos: vi.fn() }));
vi.mock("@/features/filtro-conteudo/classificar", () => ({ classificarMidia: vi.fn() }));

const aviso = (sobrescrever: Partial<AvisoEpisodio> = {}): AvisoEpisodio => ({
  id: "0b5f2c1e-6d4a-4f8b-9c3d-2e1a7b6c5d4e",
  serieTmdbId: 95396,
  serieTitulo: "Ruptura",
  temporada: 2,
  episodio: 8,
  dataEstreia: "2026-11-20",
  ...sobrescrever,
});

const supabase = { nome: "cliente" };

afterEach(() => vi.clearAllMocks());

describe("CartaoAvisos", () => {
  it("diz o episódio, a data, leva à temporada e marca como lido", async () => {
    render(<CartaoAvisos avisos={[aviso()]} />);

    const cartao = screen.getByRole("complementary", { name: "Episódios novos" });
    expect(within(cartao).getByText("Saiu o episódio 8 da temporada 2 de Ruptura")).toBeVisible();
    expect(within(cartao).getByText("Estreou em 20/11/2026")).toBeVisible();
    expect(within(cartao).getByRole("link", { name: "Ver temporada 2" })).toHaveAttribute(
      "href",
      "/serie/95396/temporada/2",
    );

    const botao = within(cartao).getByRole("button", { name: "Marcar como lido" });
    expect(botao).toHaveAccessibleDescription("Saiu o episódio 8 da temporada 2 de Ruptura");
    await userEvent.click(botao);
    expect(marcarAvisoLido).toHaveBeenCalledOnce();
    const [, form] = vi.mocked(marcarAvisoLido).mock.calls[0]!;
    expect((form as FormData).get("id")).toBe(aviso().id);
  });

  it("mostra a mensagem de erro da action", async () => {
    vi.mocked(marcarAvisoLido).mockResolvedValueOnce({ mensagem: "Falhou." });
    render(<CartaoAvisos avisos={[aviso()]} />);

    await userEvent.click(screen.getByRole("button", { name: "Marcar como lido" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Falhou.");
  });
});

describe("AvisosEpisodios", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockResolvedValue(supabase as never);
  });

  async function renderizar(filtro: "10" | "14" | "18" | null = null) {
    const elemento = await AvisosEpisodios({
      usuarioId: "u-1",
      filtro,
      agora: new Date("2026-11-25T02:00:00Z"),
    });
    return elemento ? render(elemento) : null;
  }

  it("gera os avisos antes de ler os de até hoje em São Paulo, e mostra no máximo 3", async () => {
    const ordem: string[] = [];
    vi.mocked(gerarAvisos).mockImplementation(async () => void ordem.push("gerar"));
    vi.mocked(obterAvisosNaoLidos).mockImplementation(async () => {
      ordem.push("ler");
      return [1, 2, 3, 4].map((n) => aviso({ id: `id-${n}`, episodio: n }));
    });

    await renderizar();

    expect(ordem).toEqual(["gerar", "ler"]);
    expect(gerarAvisos).toHaveBeenCalledWith(supabase, "u-1");
    // 02h UTC de 25/11 ainda é 24/11 em São Paulo.
    expect(obterAvisosNaoLidos).toHaveBeenCalledWith(supabase, "u-1", "2026-11-24");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByText(/episódio 4 /)).toBeNull();
  });

  it("sem avisos não aparece", async () => {
    vi.mocked(obterAvisosNaoLidos).mockResolvedValue([]);
    expect(await renderizar()).toBeNull();
  });

  it("com o filtro, tira a série bloqueada (+18)", async () => {
    vi.mocked(obterAvisosNaoLidos).mockResolvedValue([
      aviso({ id: "a", serieTmdbId: 1, serieTitulo: "Adulta" }),
      aviso({ id: "b", serieTmdbId: 2, serieTitulo: "Livre" }),
    ]);
    vi.mocked(classificarMidia).mockImplementation(async ({ tmdbId }) =>
      tmdbId === 1 ? "18" : "L",
    );

    await renderizar("14");

    expect(classificarMidia).toHaveBeenCalledWith({ tipo: "serie", tmdbId: 1 });
    expect(screen.getByText(/de Livre$/)).toBeVisible();
    expect(screen.queryByText(/de Adulta$/)).toBeNull();
  });

  it("erro inesperado não quebra o início: o cartão só não aparece", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(gerarAvisos).mockRejectedValue(new Error("rede"));
    expect(await renderizar()).toBeNull();
    expect(obterAvisosNaoLidos).not.toHaveBeenCalled();
  });
});
