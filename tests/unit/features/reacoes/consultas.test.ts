import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { obterReacao, obterReacoes } from "@/features/reacoes/consultas";
import { definirReacao } from "@/features/reacoes/gravar";

import { bancoEmMemoria } from "../../../support/banco-memoria";
import { detalhes } from "../mcp/fakes";

/** No TMDB, filme e série têm sequências de ID independentes: este ID é os dois. */
const ID = 1399;

function banco() {
  return bancoEmMemoria({
    reacoes: [
      { tipo: "serie", tmdb_id: ID, reacao: "nao-gostei", titulo: "Série 1399", generos: [10765] },
      { tipo: "filme", tmdb_id: ID, reacao: "amei", titulo: "Filme 1399", generos: [18] },
    ],
  });
}

describe("leituras de reações só veem filmes", () => {
  it("obterReacoes ignora a reação à série de mesmo ID", async () => {
    expect(await obterReacoes(banco().cliente)).toEqual([
      { tmdbId: ID, reacao: "amei", titulo: "Filme 1399", generos: [18] },
    ]);
  });

  it("obterReacao devolve a reação ao filme", async () => {
    expect(await obterReacao(ID, banco().cliente)).toBe("amei");
  });
});

describe("definirReacao só mexe na reação ao filme", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("troca a reação ao filme gravando tipo filme", async () => {
    const b = banco();

    const resultado = await definirReacao(b.cliente, "u-1", ID, "gostei", async (id) =>
      detalhes(id),
    );

    expect(resultado).toEqual({
      ok: true,
      titulo: "Filme 1399",
      anterior: "amei",
      atual: "gostei",
    });
    expect(b.escritas).toEqual([
      {
        tabela: "reacoes",
        op: "upsert",
        filtros: [],
        valor: expect.objectContaining({ tipo: "filme", tmdb_id: ID, reacao: "gostei" }),
      },
    ]);
  });

  it("com null, apaga a reação ao filme e deixa a da série", async () => {
    const b = banco();

    expect(await definirReacao(b.cliente, "u-1", ID, null)).toEqual({
      ok: true,
      titulo: "Filme 1399",
      anterior: "amei",
      atual: null,
    });
    expect(b.tabelas.reacoes).toEqual([expect.objectContaining({ tipo: "serie", tmdb_id: ID })]);
  });
});
