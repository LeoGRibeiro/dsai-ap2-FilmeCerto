import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import MetricasPage from "@/app/(app)/metricas/page";
import { TabelaMetricas } from "@/features/metricas/components/tabela-metricas";
import { obterMetricas, type Metricas } from "@/features/metricas/consultas";
import { createClient } from "@/lib/supabase/server";
import type { ClienteSupabase } from "@/lib/supabase/token";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

type Rpc = { data: unknown; error: { code: string; message: string } | null };

function clienteFalso(eventos: Rpc, climas: Rpc) {
  const rpc = vi.fn(async (nome: string) => (nome === "metricas_eventos" ? eventos : climas));
  return { rpc } as unknown as ClienteSupabase;
}

const semPermissao: Rpc = {
  data: null,
  error: { code: "42501", message: "acesso só para a equipe" },
};

const totais: Metricas = {
  eventos: [{ nome: "trailer_aberto", total: 12, pessoas: 5, semEquipe: 9 }],
  climas: [
    { pergunta: "humor", resposta: "pra-baixo", total: 4 },
    { pergunta: "humor", resposta: "cansado", total: 7 },
    { pergunta: "companhia", resposta: "familia", total: 2 },
  ],
};

describe("obterMetricas", () => {
  it("devolve null para quem não está na equipe", async () => {
    const cliente = clienteFalso(semPermissao, semPermissao);
    expect(await obterMetricas(cliente)).toBeNull();
  });

  it("converte os totais do banco", async () => {
    const cliente = clienteFalso(
      { data: [{ nome: "trailer_aberto", total: 12, pessoas: 5, sem_equipe: 9 }], error: null },
      { data: totais.climas, error: null },
    );
    expect(await obterMetricas(cliente)).toEqual(totais);
  });

  it("deixa subir outros erros do banco", async () => {
    const cliente = clienteFalso(
      { data: null, error: { code: "57014", message: "timeout" } },
      semPermissao,
    );
    await expect(obterMetricas(cliente)).rejects.toThrow("57014");
  });
});

describe("TabelaMetricas", () => {
  it("mostra todos os eventos, com zero nos que ainda não ocorreram", () => {
    render(<TabelaMetricas metricas={totais} />);
    const tabela = screen.getByRole("table", { name: "Eventos de uso" });

    const trailer = within(tabela).getByRole("row", { name: /Abriu um trailer/ });
    expect(
      within(trailer)
        .getAllByRole("cell")
        .map((c) => c.textContent),
    ).toEqual(["12", "5", "9"]);

    const iniciado = within(tabela).getByRole("row", { name: /Abriu o wizard/ });
    expect(
      within(iniciado)
        .getAllByRole("cell")
        .map((c) => c.textContent),
    ).toEqual(["0", "0", "0"]);
    expect(within(tabela).getAllByRole("row")).toHaveLength(9);
  });

  it("agrupa os climas por pergunta, do mais escolhido para o menos, com rótulos em português", () => {
    render(<TabelaMetricas metricas={totais} />);

    const humor = screen.getByRole("table", { name: "Como está se sentindo" });
    const linhas = within(humor)
      .getAllByRole("row")
      .map((linha) => linha.textContent);
    expect(linhas.slice(0, 2)).toEqual(["Cansado7", "Pra baixo4"]);
    expect(linhas).toHaveLength(6);

    const companhia = screen.getByRole("table", { name: "Com quem vai assistir" });
    expect(within(companhia).getAllByRole("row")[0]).toHaveTextContent("Família com crianças2");
  });
});

describe("página /metricas", () => {
  afterEach(() => {
    vi.mocked(createClient).mockReset();
  });

  it("responde 404 para quem não é da equipe", async () => {
    vi.mocked(createClient).mockResolvedValue(clienteFalso(semPermissao, semPermissao) as never);
    await expect(MetricasPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("mostra os totais para a equipe", async () => {
    vi.mocked(createClient).mockResolvedValue(
      clienteFalso({ data: [], error: null }, { data: [], error: null }) as never,
    );
    render(await MetricasPage());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Métricas de uso");
    expect(screen.getByRole("table", { name: "Eventos de uso" })).toBeInTheDocument();
  });
});
