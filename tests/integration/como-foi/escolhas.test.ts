import { beforeAll, describe, expect, it } from "vitest";

import { criarUsuario } from "../../support/supabase-local";

describe("RLS das escolhas da noite", () => {
  let a: Awaited<ReturnType<typeof criarUsuario>>;
  let b: Awaited<ReturnType<typeof criarUsuario>>;
  let idDeA: number;

  beforeAll(async () => {
    a = await criarUsuario("Usuária A");
    b = await criarUsuario("Usuário B");
  });

  it("o usuário grava, lê e atualiza a própria escolha, com tipo filme por padrão", async () => {
    const gravada = await a.cliente
      .from("escolhas_noite")
      .insert({ tmdb_id: 550, titulo: "Clube da Luta" })
      .select("id, tipo, usuario_id, vezes_perguntado, respondido_em")
      .single();
    expect(gravada.error).toBeNull();
    expect(gravada.data).toMatchObject({
      tipo: "filme",
      usuario_id: a.id,
      vezes_perguntado: 0,
      respondido_em: null,
    });
    idDeA = gravada.data!.id;

    const atualizada = await a.cliente
      .from("escolhas_noite")
      .update({ vezes_perguntado: 1, perguntado_em: new Date().toISOString() })
      .eq("id", idDeA)
      .select("vezes_perguntado");
    expect(atualizada.data).toEqual([{ vezes_perguntado: 1 }]);
  });

  it("outro usuário não lê nem altera a escolha", async () => {
    expect((await b.cliente.from("escolhas_noite").select("id")).data).toEqual([]);

    const alteracao = await b.cliente
      .from("escolhas_noite")
      .update({ respondido_em: new Date().toISOString() })
      .eq("id", idDeA)
      .select("id");
    expect(alteracao.data).toEqual([]);

    const deA = await a.cliente.from("escolhas_noite").select("respondido_em").eq("id", idDeA);
    expect(deA.data).toEqual([{ respondido_em: null }]);
  });

  it("ninguém grava escolha em nome de outra pessoa", async () => {
    const { error } = await a.cliente
      .from("escolhas_noite")
      .insert({ usuario_id: b.id, tmdb_id: 13, titulo: "Forrest Gump" });
    expect(error?.code).toBe("42501");
  });

  it("o banco recusa ID zero, mais de 2 perguntas e tipo fora do enum", async () => {
    const idZero = await a.cliente.from("escolhas_noite").insert({ tmdb_id: 0, titulo: "X" });
    expect(idZero.error?.code).toBe("23514");

    const perguntas = await a.cliente
      .from("escolhas_noite")
      .insert({ tmdb_id: 1, titulo: "X", vezes_perguntado: 3 });
    expect(perguntas.error?.code).toBe("23514");

    const tipo = await a.cliente
      .from("escolhas_noite")
      .insert({ tmdb_id: 1, titulo: "X", tipo: "novela" as never });
    expect(tipo.error?.code).toBe("22P02");
  });
});
