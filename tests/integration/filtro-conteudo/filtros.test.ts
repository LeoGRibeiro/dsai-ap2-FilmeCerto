import { beforeAll, describe, expect, it } from "vitest";

import { criarUsuario } from "../../support/supabase-local";

describe("RLS dos filtros de conteúdo", () => {
  let a: Awaited<ReturnType<typeof criarUsuario>>;
  let b: Awaited<ReturnType<typeof criarUsuario>>;

  beforeAll(async () => {
    a = await criarUsuario("Usuária A");
    b = await criarUsuario("Usuário B");
  });

  it("sem linha, o filtro está desligado", async () => {
    const { data, error } = await a.cliente.from("filtros_conteudo").select("modo").maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("a pessoa cria, lê, muda e apaga o próprio filtro", async () => {
    const criado = await a.cliente
      .from("filtros_conteudo")
      .insert({ classificacao_max: "14", modo: "ocultar" })
      .select("usuario_id, classificacao_max, modo")
      .single();
    expect(criado.error).toBeNull();
    expect(criado.data).toEqual({ usuario_id: a.id, classificacao_max: "14", modo: "ocultar" });

    const mudado = await a.cliente
      .from("filtros_conteudo")
      .upsert({ usuario_id: a.id, classificacao_max: "12", modo: "bloquear" })
      .select("classificacao_max, modo");
    expect(mudado.data).toEqual([{ classificacao_max: "12", modo: "bloquear" }]);

    const apagado = await a.cliente
      .from("filtros_conteudo")
      .delete()
      .eq("usuario_id", a.id)
      .select();
    expect(apagado.data).toHaveLength(1);
    expect((await a.cliente.from("filtros_conteudo").select("modo")).data).toEqual([]);

    await a.cliente.from("filtros_conteudo").insert({ classificacao_max: "16", modo: "avisar" });
  });

  it("outra pessoa não lê, não muda nem apaga o filtro", async () => {
    expect((await b.cliente.from("filtros_conteudo").select("modo")).data).toEqual([]);

    const mudanca = await b.cliente
      .from("filtros_conteudo")
      .update({ modo: "avisar", classificacao_max: "L" })
      .eq("usuario_id", a.id)
      .select();
    expect(mudanca.data).toEqual([]);

    const apagado = await b.cliente
      .from("filtros_conteudo")
      .delete()
      .eq("usuario_id", a.id)
      .select();
    expect(apagado.data).toEqual([]);

    const deA = await a.cliente.from("filtros_conteudo").select("classificacao_max, modo");
    expect(deA.data).toEqual([{ classificacao_max: "16", modo: "avisar" }]);
  });

  it("ninguém grava filtro em nome de outra pessoa", async () => {
    const { error } = await a.cliente
      .from("filtros_conteudo")
      .insert({ usuario_id: b.id, classificacao_max: "10", modo: "bloquear" });
    expect(error?.code).toBe("42501");
  });

  it("o banco recusa o limite 18, um limite desconhecido e um modo fora do enum", async () => {
    const dezoito = await b.cliente
      .from("filtros_conteudo")
      .insert({ classificacao_max: "18", modo: "ocultar" });
    expect(dezoito.error?.code).toBe("23514");

    const desconhecido = await b.cliente
      .from("filtros_conteudo")
      .insert({ classificacao_max: "PG-13", modo: "ocultar" });
    expect(desconhecido.error?.code).toBe("23514");

    const modo = await b.cliente
      .from("filtros_conteudo")
      .insert({ classificacao_max: "12", modo: "esconder" as never });
    expect(modo.error?.code).toBe("22P02");
  });
});
