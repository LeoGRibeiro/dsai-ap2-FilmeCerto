import { afterEach, describe, expect, it, vi } from "vitest";

import { definirLista } from "@/features/listas/gravar";
import { definirReacao } from "@/features/reacoes/gravar";
import { obterFilme } from "@/lib/tmdb/filmes";
import { obterSerie } from "@/lib/tmdb/series";
import { buscarTitulo } from "@/lib/tmdb/titulo";

import { bancoEmMemoria } from "../../../support/banco-memoria";
import { detalhes } from "../../features/mcp/fakes";

vi.mock("@/lib/tmdb/filmes", () => ({ obterFilme: vi.fn() }));
vi.mock("@/lib/tmdb/series", () => ({ obterSerie: vi.fn() }));

afterEach(() => vi.clearAllMocks());

describe("buscarTitulo", () => {
  it("busca filme em /movie e série em /tv", () => {
    expect(buscarTitulo("filme")).toBe(obterFilme);
    expect(buscarTitulo("serie")).toBe(obterSerie);
  });
});

describe("gravações sem buscar explícito", () => {
  it("definirLista de série busca a série, não o filme de mesmo ID", async () => {
    vi.mocked(obterSerie).mockResolvedValue(null);

    const resultado = await definirLista(
      bancoEmMemoria({}).cliente,
      "u-1",
      { tipo: "serie", tmdbId: 1399 },
      "assistido",
    );

    expect(resultado).toEqual({ ok: false, erro: "filme-nao-encontrado" });
    expect(obterSerie).toHaveBeenCalledWith(1399);
    expect(obterFilme).not.toHaveBeenCalled();
  });

  it("definirReacao com o ID sozinho continua buscando o filme", async () => {
    vi.mocked(obterFilme).mockResolvedValue(detalhes(550));

    const resultado = await definirReacao(bancoEmMemoria({}).cliente, "u-1", 550, "gostei");

    expect(resultado).toMatchObject({ ok: true, titulo: "Filme 550", atual: "gostei" });
    expect(obterFilme).toHaveBeenCalledWith(550);
    expect(obterSerie).not.toHaveBeenCalled();
  });
});
