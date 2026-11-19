import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { idsNasListas, obterItensLista, obterStatusLista } from "@/features/listas/consultas";
import { definirLista } from "@/features/listas/gravar";

import { bancoEmMemoria } from "../../../support/banco-memoria";
import { detalhes } from "../mcp/fakes";

/** No TMDB, filme e série têm sequências de ID independentes: este ID é os dois. */
const ID = 1399;

function banco() {
  return bancoEmMemoria({
    lista_itens: [
      {
        tipo: "serie",
        tmdb_id: ID,
        status: "quero_assistir",
        titulo: "Série 1399",
        poster_path: null,
        ano: 2011,
      },
      {
        tipo: "filme",
        tmdb_id: ID,
        status: "assistido",
        titulo: "Filme 1399",
        poster_path: "/f.jpg",
        ano: 2001,
      },
      {
        tipo: "filme",
        tmdb_id: 550,
        status: "assistido",
        titulo: "Filme 550",
        poster_path: null,
        ano: 1999,
      },
    ],
    reacoes: [
      { tipo: "serie", tmdb_id: ID, reacao: "nao-gostei" },
      { tipo: "filme", tmdb_id: 550, reacao: "amei" },
    ],
  });
}

describe("leituras das listas só veem filmes", () => {
  it("obterItensLista não lista a série nem usa a reação dada a ela", async () => {
    expect(await obterItensLista(banco().cliente)).toEqual([
      {
        tmdbId: ID,
        status: "assistido",
        titulo: "Filme 1399",
        posterPath: "/f.jpg",
        ano: 2001,
        reacao: null,
      },
      {
        tmdbId: 550,
        status: "assistido",
        titulo: "Filme 550",
        posterPath: null,
        ano: 1999,
        reacao: "amei",
      },
    ]);
  });

  it("idsNasListas devolve só os filmes, sem repetir o ID da série", async () => {
    expect(await idsNasListas(banco().cliente)).toEqual([ID, 550]);
  });

  it("obterStatusLista devolve a lista do filme", async () => {
    expect(await obterStatusLista(ID, banco().cliente)).toBe("assistido");
  });
});

describe("definirLista só mexe no item do filme", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("troca a lista do filme gravando tipo filme", async () => {
    const b = banco();

    const resultado = await definirLista(b.cliente, "u-1", ID, "quero_assistir", async (id) =>
      detalhes(id),
    );

    expect(resultado).toMatchObject({ ok: true, anterior: "assistido", atual: "quero_assistir" });
    expect(b.escritas).toEqual([
      {
        tabela: "lista_itens",
        op: "upsert",
        filtros: [],
        valor: expect.objectContaining({ tipo: "filme", tmdb_id: ID, status: "quero_assistir" }),
      },
    ]);
  });

  it("com null, tira o filme da lista e deixa a série", async () => {
    const b = banco();

    expect(await definirLista(b.cliente, "u-1", ID, null)).toEqual({
      ok: true,
      titulo: "Filme 1399",
      anterior: "assistido",
      atual: null,
    });
    expect(b.tabelas.lista_itens.map((l) => [l.tipo, l.tmdb_id])).toEqual([
      ["serie", ID],
      ["filme", 550],
    ]);
  });
});
