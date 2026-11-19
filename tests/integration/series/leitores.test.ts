import { beforeAll, describe, expect, it } from "vitest";

import { idsNasListas, obterItensLista, obterStatusLista } from "@/features/listas/consultas";
import { definirLista } from "@/features/listas/gravar";
import { idsParaExcluir } from "@/features/noite/consultas";
import { obterReacao, obterReacoes } from "@/features/reacoes/consultas";
import { definirReacao } from "@/features/reacoes/gravar";

import { criarUsuario } from "../../support/supabase-local";

/** No TMDB, filme e série têm sequências de ID independentes: este ID é os dois. */
const ID = 1399;

describe("leituras e gravações de filmes ignoram a série de mesmo ID", () => {
  let a: Awaited<ReturnType<typeof criarUsuario>>;

  beforeAll(async () => {
    a = await criarUsuario("Usuária A");
    const comum = { usuario_id: a.id, tmdb_id: ID };
    const gravacoes = await Promise.all([
      a.cliente.from("reacoes").insert([
        { ...comum, tipo: "filme", reacao: "amei", titulo: "Filme 1399", generos: [18] },
        { ...comum, tipo: "serie", reacao: "nao-gostei", titulo: "Série 1399", generos: [10765] },
      ]),
      a.cliente.from("lista_itens").insert([
        { ...comum, tipo: "filme", status: "assistido", titulo: "Filme 1399" },
        { ...comum, tipo: "serie", status: "quero_assistir", titulo: "Série 1399" },
      ]),
    ]);
    for (const { error } of gravacoes) if (error) throw error;
  });

  it("as leituras do motor, das listas, da página do filme e do wizard veem só o filme", async () => {
    expect(await obterReacoes(a.cliente)).toEqual([
      { tmdbId: ID, reacao: "amei", titulo: "Filme 1399", generos: [18] },
    ]);
    expect(await obterReacao(ID, a.cliente)).toBe("amei");
    expect(await obterItensLista(a.cliente)).toEqual([
      expect.objectContaining({ tmdbId: ID, status: "assistido", reacao: "amei" }),
    ]);
    expect(await idsNasListas(a.cliente)).toEqual([ID]);
    expect(await obterStatusLista(ID, a.cliente)).toBe("assistido");
    expect(await idsParaExcluir(a.cliente)).toEqual([ID, ID]);
  });

  it("tirar a reação e a lista do filme deixa as da série", async () => {
    expect(await definirReacao(a.cliente, a.id, ID, null)).toMatchObject({
      ok: true,
      anterior: "amei",
    });
    expect(await definirLista(a.cliente, a.id, ID, null)).toMatchObject({
      ok: true,
      anterior: "assistido",
    });

    const reacoes = await a.cliente.from("reacoes").select("tipo, reacao");
    const itens = await a.cliente.from("lista_itens").select("tipo, status");
    expect(reacoes.data).toEqual([{ tipo: "serie", reacao: "nao-gostei" }]);
    expect(itens.data).toEqual([{ tipo: "serie", status: "quero_assistir" }]);
  });
});
