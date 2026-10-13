import { beforeAll, describe, expect, it } from "vitest";

import { definirLista } from "@/features/listas/gravar";
import { definirReacao } from "@/features/reacoes/gravar";
import type { FilmeDetalhes } from "@/lib/tmdb/tipos";

import { criarUsuario } from "../../support/supabase-local";

const filme = (id: number) =>
  ({ id, titulo: `Filme ${id}`, posterPath: null, ano: 2020, generos: [{ id: 18, nome: "Drama" }] }) as FilmeDetalhes;
const buscar = async (id: number) => (id === 404 ? null : filme(id));
const tmdbFora = async () => {
  throw new Error("fora");
};

describe("definirLista / definirReacao", () => {
  let a: Awaited<ReturnType<typeof criarUsuario>>;
  let b: Awaited<ReturnType<typeof criarUsuario>>;
  beforeAll(async () => {
    a = await criarUsuario("Gravadora");
    b = await criarUsuario("Intrusa");
  });

  it("definir a mesma lista duas vezes deixa o mesmo estado e informa o anterior", async () => {
    const r1 = await definirLista(a.cliente, a.id, 10, "quero_assistir", buscar);
    expect(r1).toEqual({ ok: true, titulo: "Filme 10", anterior: null, atual: "quero_assistir" });
    const r2 = await definirLista(a.cliente, a.id, 10, "quero_assistir", buscar);
    expect(r2).toEqual({ ok: true, titulo: "Filme 10", anterior: "quero_assistir", atual: "quero_assistir" });
    const r3 = await definirLista(a.cliente, a.id, 10, "assistido", buscar);
    expect(r3).toMatchObject({ ok: true, anterior: "quero_assistir", atual: "assistido" });
    const { data } = await a.cliente.from("lista_itens").select("tmdb_id, status");
    expect(data).toEqual([{ tmdb_id: 10, status: "assistido" }]);
  });

  it("null remove, e remover de novo não falha", async () => {
    expect(await definirLista(a.cliente, a.id, 10, null, buscar)).toEqual({
      ok: true, titulo: "Filme 10", anterior: "assistido", atual: null,
    });
    expect(await definirLista(a.cliente, a.id, 10, null, tmdbFora)).toEqual({
      ok: true, titulo: null, anterior: null, atual: null,
    });
    expect((await a.cliente.from("lista_itens").select("tmdb_id")).data).toEqual([]);
  });

  it("RLS: gravar em nome de outro usuário é recusado pelo banco", async () => {
    expect(await definirLista(a.cliente, b.id, 77, "assistido", buscar)).toEqual({ ok: false, erro: "banco" });
  });

  it("filme inexistente e TMDB fora do ar viram erros tipados", async () => {
    expect(await definirLista(a.cliente, a.id, 404, "assistido", buscar)).toEqual({ ok: false, erro: "filme-nao-encontrado" });
    expect(await definirReacao(a.cliente, a.id, 11, "amei", tmdbFora)).toEqual({ ok: false, erro: "tmdb" });
  });

  it("reação: definir, repetir, trocar e apagar", async () => {
    expect(await definirReacao(a.cliente, a.id, 12, "gostei", buscar)).toMatchObject({ ok: true, anterior: null, atual: "gostei" });
    expect(await definirReacao(a.cliente, a.id, 12, "gostei", buscar)).toMatchObject({ anterior: "gostei", atual: "gostei" });
    expect(await definirReacao(a.cliente, a.id, 12, "amei", buscar)).toMatchObject({ anterior: "gostei", atual: "amei" });
    expect(await definirReacao(a.cliente, a.id, 12, null, buscar)).toMatchObject({ anterior: "amei", atual: null });
  });
});
