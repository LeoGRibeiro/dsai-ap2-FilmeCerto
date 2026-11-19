import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import MetricasPage from "@/app/(app)/metricas/page";
import { FunilMetricas } from "@/features/metricas/components/funil-metricas";
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
type Funcao = "metricas_eventos" | "metricas_climas" | "metricas_detalhes";

/** Cliente com a resposta de cada função; as que faltam respondem uma lista vazia. */
function clienteFalso(respostas: Partial<Record<Funcao, Rpc>> = {}) {
  const rpc = vi.fn(async (nome: Funcao) => respostas[nome] ?? { data: [], error: null });
  return { rpc } as unknown as ClienteSupabase;
}

const semPermissao: Rpc = {
  data: null,
  error: { code: "42501", message: "acesso só para a equipe" },
};

const foraDaEquipe = () =>
  clienteFalso({
    metricas_eventos: semPermissao,
    metricas_climas: semPermissao,
    metricas_detalhes: semPermissao,
  });

const totais: Metricas = {
  eventos: [{ nome: "trailer_aberto", total: 12, pessoas: 5, semEquipe: 9 }],
  climas: [
    { pergunta: "humor", resposta: "pra-baixo", total: 4 },
    { pergunta: "humor", resposta: "cansado", total: 7 },
    { pergunta: "companhia", resposta: "familia", total: 2 },
  ],
  detalhes: [{ nome: "trailer_aberto", chave: "origem", valor: "filme", total: 12, semEquipe: 9 }],
};

describe("obterMetricas", () => {
  it("devolve null para quem não está na equipe", async () => {
    expect(await obterMetricas(foraDaEquipe())).toBeNull();
  });

  it.each<Funcao>(["metricas_eventos", "metricas_climas", "metricas_detalhes"])(
    "devolve null quando %s recusa o acesso",
    async (funcao) => {
      expect(await obterMetricas(clienteFalso({ [funcao]: semPermissao }))).toBeNull();
    },
  );

  it("converte os totais do banco", async () => {
    const cliente = clienteFalso({
      metricas_eventos: {
        data: [{ nome: "trailer_aberto", total: 12, pessoas: 5, sem_equipe: 9 }],
        error: null,
      },
      metricas_climas: { data: totais.climas, error: null },
      metricas_detalhes: {
        data: [
          { nome: "trailer_aberto", chave: "origem", valor: "filme", total: 12, sem_equipe: 9 },
        ],
        error: null,
      },
    });
    expect(await obterMetricas(cliente)).toEqual(totais);
  });

  it("deixa subir outros erros do banco", async () => {
    const cliente = clienteFalso({
      metricas_detalhes: { data: null, error: { code: "57014", message: "timeout" } },
    });
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

const comFunil: Metricas = {
  eventos: [
    { nome: "wizard_iniciado", total: 10, pessoas: 6, semEquipe: 4 },
    { nome: "wizard_concluido", total: 8, pessoas: 5, semEquipe: 2 },
    { nome: "wizard_escolheu", total: 3, pessoas: 3, semEquipe: 1 },
    { nome: "como_foi_exibido", total: 4, pessoas: 2, semEquipe: 0 },
    { nome: "como_foi_respondido", total: 3, pessoas: 2, semEquipe: 0 },
  ],
  climas: [],
  detalhes: [
    { nome: "wizard_troca", chave: "motivo", valor: "ja-vi", total: 3, semEquipe: 1 },
    { nome: "wizard_troca", chave: "motivo", valor: "muito-longo", total: 1, semEquipe: 1 },
    { nome: "wizard_escolheu", chave: "trocas", valor: "0", total: 2, semEquipe: 1 },
    { nome: "wizard_escolheu", chave: "trocas", valor: "2", total: 1, semEquipe: 0 },
    { nome: "wizard_abandonado", chave: "etapa", valor: "resultado", total: 2, semEquipe: 2 },
    { nome: "como_foi_respondido", chave: "resposta", valor: "amei", total: 2, semEquipe: 0 },
    { nome: "como_foi_respondido", chave: "resposta", valor: "nao-vi", total: 1, semEquipe: 0 },
    { nome: "trailer_aberto", chave: "origem", valor: "filme", total: 15, semEquipe: 1 },
    { nome: "trailer_aberto", chave: "origem", valor: "noite", total: 3, semEquipe: 3 },
    { nome: "trailer_aberto", chave: "origem", valor: "serie", total: 2, semEquipe: 0 },
  ],
};

/** Texto de cada linha de uma lista do funil ou dos detalhes. */
function linhas(nome: string) {
  return within(screen.getByRole("list", { name: nome }))
    .getAllByRole("listitem")
    .map((linha) => linha.textContent);
}

describe("FunilMetricas", () => {
  it("mostra o funil do wizard com o número e as porcentagens em texto", () => {
    render(<FunilMetricas metricas={comFunil} recorte="todos" />);
    expect(linhas("Funil do wizard")).toEqual([
      "Abriu o wizard10",
      "Chegou à recomendação8 · 80% do início",
      "Clicou “Vou ver esse!”3 · 30% do início · 38% da etapa anterior",
    ]);
    expect(linhas("Funil do “Como foi?”")).toEqual([
      "Viu o “Como foi?”4",
      "Respondeu o “Como foi?”3 · 75% do início",
    ]);
  });

  it("desenha as barras só como reforço visual, com a largura da % do início", () => {
    render(<FunilMetricas metricas={comFunil} recorte="todos" />);
    const barras = screen
      .getByRole("list", { name: "Funil do wizard" })
      .querySelectorAll<HTMLElement>('[aria-hidden="true"] > div');
    expect([...barras].map((barra) => barra.style.width)).toEqual(["100%", "80%", "30%"]);
  });

  it("mostra todos os valores de cada detalhe, com rótulo, número e porcentagem", () => {
    render(<FunilMetricas metricas={comFunil} recorte="todos" />);
    expect(linhas("Trocas por motivo")).toEqual([
      "Já vi3 · 75%",
      "Não é o clima0 · 0%",
      "Muito longo1 · 25%",
      "Outro0 · 0%",
    ]);
    expect(linhas("Trocas até escolher")).toEqual([
      "De primeira2 · 67%",
      "Depois de 1 troca0 · 0%",
      "Depois de 2 trocas1 · 33%",
      "Depois de 3 trocas0 · 0%",
      "Depois de 4 trocas0 · 0%",
      "Depois de 5 trocas0 · 0%",
    ]);
    expect(linhas("Saídas sem escolher")).toEqual(["Nas perguntas0 · 0%", "No resultado2 · 100%"]);
    expect(linhas("Respostas do “Como foi?”")).toEqual([
      "Amei2 · 67%",
      "Gostei0 · 0%",
      "Não é pra mim0 · 0%",
      "Não cheguei a ver1 · 33%",
    ]);
    expect(linhas("Trailers por origem")).toEqual([
      "Página do filme15 · 75%",
      "Wizard da noite3 · 15%",
      "Página da série2 · 10%",
    ]);
  });

  it("sem nenhum evento, mostra zeros sem porcentagem", () => {
    render(<FunilMetricas metricas={{ eventos: [], climas: [], detalhes: [] }} recorte="todos" />);
    expect(linhas("Funil do wizard")).toEqual([
      "Abriu o wizard0",
      "Chegou à recomendação0",
      "Clicou “Vou ver esse!”0",
    ]);
    expect(linhas("Trailers por origem")).toEqual([
      "Página do filme0",
      "Wizard da noite0",
      "Página da série0",
    ]);
    const secao = screen.getByRole("region", { name: "Funil e detalhes" });
    expect(secao.textContent).not.toMatch(/NaN|%/);
  });
});

describe("página /metricas", () => {
  afterEach(() => {
    vi.mocked(createClient).mockReset();
  });

  const props = (busca: Record<string, string> = {}) => ({
    params: Promise.resolve({}),
    searchParams: Promise.resolve(busca),
  });

  /** Cliente que responde as métricas no formato do banco (`sem_equipe`). */
  function clienteCom({ eventos, climas, detalhes }: Metricas) {
    const banco = <T extends { semEquipe: number }>(linhas: T[]): Rpc => ({
      data: linhas.map(({ semEquipe, ...linha }) => ({ ...linha, sem_equipe: semEquipe })),
      error: null,
    });
    return clienteFalso({
      metricas_eventos: banco(eventos),
      metricas_climas: { data: climas, error: null },
      metricas_detalhes: banco(detalhes),
    });
  }

  it("responde 404 para quem não é da equipe", async () => {
    vi.mocked(createClient).mockResolvedValue(foraDaEquipe() as never);
    await expect(MetricasPage(props())).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("mostra o funil e os totais para a equipe, contando todos por padrão", async () => {
    vi.mocked(createClient).mockResolvedValue(clienteCom(comFunil) as never);
    render(await MetricasPage(props()));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Métricas de uso");
    expect(screen.getByRole("table", { name: "Eventos de uso" })).toBeInTheDocument();
    expect(linhas("Funil do wizard")[0]).toBe("Abriu o wizard10");
    expect(screen.getByRole("link", { name: "Todos" })).toHaveAttribute("aria-current", "page");
  });

  it("com ?recorte=sem-equipe, conta só as contas de fora da equipe", async () => {
    vi.mocked(createClient).mockResolvedValue(clienteCom(comFunil) as never);
    render(await MetricasPage(props({ recorte: "sem-equipe" })));

    const semEquipe = screen.getByRole("link", { name: "Sem a equipe" });
    expect(semEquipe).toHaveAttribute("aria-current", "page");
    expect(semEquipe).toHaveAttribute("href", "/metricas?recorte=sem-equipe");
    expect(screen.getByRole("link", { name: "Todos" })).not.toHaveAttribute("aria-current");

    expect(linhas("Funil do wizard")).toEqual([
      "Abriu o wizard4",
      "Chegou à recomendação2 · 50% do início",
      "Clicou “Vou ver esse!”1 · 25% do início · 50% da etapa anterior",
    ]);
    expect(linhas("Trailers por origem")).toEqual([
      "Página do filme1 · 25%",
      "Wizard da noite3 · 75%",
      "Página da série0 · 0%",
    ]);
    expect(linhas("Respostas do “Como foi?”")).toEqual([
      "Amei0",
      "Gostei0",
      "Não é pra mim0",
      "Não cheguei a ver0",
    ]);
  });
});
