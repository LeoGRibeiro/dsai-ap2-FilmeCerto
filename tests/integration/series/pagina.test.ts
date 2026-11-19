import { beforeAll, describe, expect, it } from "vitest";

import { obterItensLista, obterStatusLista } from "@/features/listas/consultas";
import { definirLista } from "@/features/listas/gravar";
import { obterReacao } from "@/features/reacoes/consultas";
import { definirReacao } from "@/features/reacoes/gravar";
import type { DadosTitulo } from "@/lib/tmdb/titulo";

import { criarUsuario } from "../../support/supabase-local";

/** No TMDB, filme e série têm sequências de ID independentes: este ID é os dois. */
const ID = 1399;
const SERIE = { tipo: "serie", tmdbId: ID } as const;

const dados = (titulo: string, genero: number): DadosTitulo => ({
  titulo,
  posterPath: null,
  ano: 2011,
  generos: [{ id: genero, nome: "" }],
});
const buscarSerie = async () => dados("Série 1399", 10765);
const buscarFilme = async () => dados("Filme 1399", 18);

describe("reações e listas de séries no Supabase local", () => {
  let a: Awaited<ReturnType<typeof criarUsuario>>;

  beforeAll(async () => {
    a = await criarUsuario("Usuária A");
  });

  it("filme e série de mesmo ID recebem reação e lista sem se misturar", async () => {
    expect(await definirReacao(a.cliente, a.id, ID, "gostei", buscarFilme)).toMatchObject({
      ok: true,
    });
    expect(await definirReacao(a.cliente, a.id, SERIE, "amei", buscarSerie)).toMatchObject({
      ok: true,
      titulo: "Série 1399",
    });
    expect(await definirLista(a.cliente, a.id, SERIE, "quero_assistir", buscarSerie)).toMatchObject(
      {
        ok: true,
      },
    );

    expect(await obterReacao(SERIE, a.cliente)).toBe("amei");
    expect(await obterReacao(ID, a.cliente)).toBe("gostei");
    expect(await obterStatusLista(SERIE, a.cliente)).toBe("quero_assistir");
    expect(await obterStatusLista(ID, a.cliente)).toBeNull();

    const serie = await a.cliente
      .from("reacoes")
      .select("titulo, generos")
      .eq("tipo", "serie")
      .eq("tmdb_id", ID)
      .single();
    expect(serie.data).toEqual({ titulo: "Série 1399", generos: [10765] });
  });

  it("/listas traz a série com a reação dela; o padrão continua só com filmes", async () => {
    expect(await obterItensLista(a.cliente, ["filme", "serie"])).toEqual([
      expect.objectContaining({
        tipo: "serie",
        tmdbId: ID,
        status: "quero_assistir",
        reacao: "amei",
      }),
    ]);
    expect(await obterItensLista(a.cliente)).toEqual([]);
  });

  it("tirar a reação da série deixa a do filme", async () => {
    expect(await definirReacao(a.cliente, a.id, SERIE, null)).toMatchObject({ anterior: "amei" });
    const reacoes = await a.cliente.from("reacoes").select("tipo, reacao");
    expect(reacoes.data).toEqual([{ tipo: "filme", reacao: "gostei" }]);
  });
});
