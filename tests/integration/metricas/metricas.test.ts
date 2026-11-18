import { beforeAll, describe, expect, it } from "vitest";

import { criarUsuario, novoCliente } from "../../support/supabase-local";

describe("RLS das métricas", () => {
  let a: Awaited<ReturnType<typeof criarUsuario>>;
  let b: Awaited<ReturnType<typeof criarUsuario>>;

  beforeAll(async () => {
    a = await criarUsuario("Usuária A");
    b = await criarUsuario("Usuário B");
  });

  it("o usuário registra o próprio evento, mas não lê nenhum evento", async () => {
    const { error } = await a.cliente
      .from("eventos")
      .insert({ nome: "trailer_aberto", dados: { origem: "filme" } });
    expect(error).toBeNull();

    const leitura = await a.cliente.from("eventos").select("nome");
    expect(leitura.data).toEqual([]);
  });

  it("o usuário não registra evento em nome de outro", async () => {
    const { error } = await a.cliente
      .from("eventos")
      .insert({ usuario_id: b.id, nome: "wizard_iniciado" });
    expect(error?.code).toBe("42501");
  });

  it("o banco recusa evento fora da lista e clima do wizard nos dados", async () => {
    const desconhecido = await a.cliente.from("eventos").insert({ nome: "login" });
    expect(desconhecido.error?.code).toBe("23514");

    const comHumor = await a.cliente
      .from("eventos")
      .insert({ nome: "wizard_concluido", dados: { humor: "cansado" } });
    expect(comHumor.error?.code).toBe("23514");
  });

  it("registrar_clima conta sem expor a contagem nem a equipe", async () => {
    const registro = await a.cliente.rpc("registrar_clima", {
      p_humor: "cansado",
      p_experiencia: "rir",
      p_companhia: "a-dois",
    });
    expect(registro.error).toBeNull();

    const invalido = await a.cliente.rpc("registrar_clima", {
      p_humor: "feliz",
      p_experiencia: "rir",
      p_companhia: "a-dois",
    });
    expect(invalido.error?.code).toBe("23514");

    expect((await a.cliente.from("contagem_climas").select("total")).data).toEqual([]);
    expect((await a.cliente.from("equipe_metricas").select("usuario_id")).data).toEqual([]);
  });

  it("os totais só respondem a quem está na equipe", async () => {
    const eventos = await a.cliente.rpc("metricas_eventos");
    expect(eventos.error?.code).toBe("42501");

    const climas = await b.cliente.rpc("metricas_climas");
    expect(climas.error?.code).toBe("42501");
  });

  it("os detalhes dos eventos só respondem a quem está na equipe", async () => {
    await a.cliente.from("eventos").insert({ nome: "wizard_troca", dados: { motivo: "ja-vi" } });

    const logado = await a.cliente.rpc("metricas_detalhes");
    expect(logado.error?.code).toBe("42501");
    expect(logado.data).toBeNull();

    const anonimo = await novoCliente().rpc("metricas_detalhes");
    expect(anonimo.error).not.toBeNull();
    expect(anonimo.data).toBeNull();
  });
});
