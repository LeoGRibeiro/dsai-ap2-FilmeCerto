import { beforeAll, describe, expect, it } from "vitest";

import { criarUsuario } from "../../support/supabase-local";

describe("RLS dos filtros por idade", () => {
  let a: Awaited<ReturnType<typeof criarUsuario>>;
  let b: Awaited<ReturnType<typeof criarUsuario>>;

  beforeAll(async () => {
    a = await criarUsuario("Usuária A");
    b = await criarUsuario("Usuário B");
  });

  it("sem linha, é Sem filtro", async () => {
    const { data, error } = await a.cliente.from("filtros_conteudo").select("limite").maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("a pessoa cria, lê, muda e apaga o próprio filtro", async () => {
    const criado = await a.cliente
      .from("filtros_conteudo")
      .insert({ limite: "14" })
      .select("usuario_id, limite")
      .single();
    expect(criado.error).toBeNull();
    expect(criado.data).toEqual({ usuario_id: a.id, limite: "14" });

    const mudado = await a.cliente
      .from("filtros_conteudo")
      .upsert({ usuario_id: a.id, limite: "10" })
      .select("limite");
    expect(mudado.data).toEqual([{ limite: "10" }]);

    const apagado = await a.cliente
      .from("filtros_conteudo")
      .delete()
      .eq("usuario_id", a.id)
      .select();
    expect(apagado.data).toHaveLength(1);
    expect((await a.cliente.from("filtros_conteudo").select("limite")).data).toEqual([]);

    await a.cliente.from("filtros_conteudo").insert({ limite: "18" });
  });

  it("outra pessoa não lê, não muda nem apaga o filtro", async () => {
    expect((await b.cliente.from("filtros_conteudo").select("limite")).data).toEqual([]);

    const mudanca = await b.cliente
      .from("filtros_conteudo")
      .update({ limite: "10" })
      .eq("usuario_id", a.id)
      .select();
    expect(mudanca.data).toEqual([]);

    const apagado = await b.cliente
      .from("filtros_conteudo")
      .delete()
      .eq("usuario_id", a.id)
      .select();
    expect(apagado.data).toEqual([]);

    const deA = await a.cliente.from("filtros_conteudo").select("limite");
    expect(deA.data).toEqual([{ limite: "18" }]);
  });

  it("ninguém grava filtro em nome de outra pessoa", async () => {
    const { error } = await a.cliente
      .from("filtros_conteudo")
      .insert({ usuario_id: b.id, limite: "10" });
    expect(error?.code).toBe("42501");
  });

  it("o banco aceita só 10, 14 e 18", async () => {
    for (const limite of ["L", "12", "16", "PG-13"]) {
      const { error } = await b.cliente.from("filtros_conteudo").insert({ limite });
      expect(error?.code, limite).toBe("23514");
    }
  });
});
