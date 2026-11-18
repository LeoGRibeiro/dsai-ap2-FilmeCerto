import { beforeAll, describe, expect, it } from "vitest";

import { criarUsuario } from "../../support/supabase-local";

type Usuario = Awaited<ReturnType<typeof criarUsuario>>;
type Tipo = "filme" | "serie";

/** Mesmo ID no TMDB como filme e como série (sequências independentes). */
const ID = 1399;

const reacao = (usuarioId: string, tipo?: Tipo) => ({
  usuario_id: usuarioId,
  tmdb_id: ID,
  reacao: "amei" as const,
  titulo: tipo === "serie" ? "Série 1399" : "Filme 1399",
  ...(tipo && { tipo }),
});

const item = (usuarioId: string, tipo?: Tipo) => ({
  usuario_id: usuarioId,
  tmdb_id: ID,
  status: "assistido" as const,
  titulo: tipo === "serie" ? "Série 1399" : "Filme 1399",
  ...(tipo && { tipo }),
});

describe("migration tipo_midia em reacoes e lista_itens", () => {
  let a: Usuario;
  let b: Usuario;

  beforeAll(async () => {
    a = await criarUsuario("Usuária A");
    b = await criarUsuario("Usuário B");
  });

  it("linhas gravadas sem tipo, como na AP1, ficam como filme", async () => {
    expect((await a.cliente.from("reacoes").insert(reacao(a.id))).error).toBeNull();
    expect((await a.cliente.from("lista_itens").insert(item(a.id))).error).toBeNull();

    const reacoes = await a.cliente.from("reacoes").select("tmdb_id, tipo");
    const itens = await a.cliente.from("lista_itens").select("tmdb_id, tipo");
    expect(reacoes.data).toEqual([{ tmdb_id: ID, tipo: "filme" }]);
    expect(itens.data).toEqual([{ tmdb_id: ID, tipo: "filme" }]);
  });

  it("o mesmo tmdb_id como filme e como série convive, e o upsert de um não muda o outro", async () => {
    expect((await a.cliente.from("reacoes").insert(reacao(a.id, "serie"))).error).toBeNull();
    expect((await a.cliente.from("lista_itens").insert(item(a.id, "serie"))).error).toBeNull();

    const troca = await a.cliente
      .from("reacoes")
      .upsert({ ...reacao(a.id, "serie"), reacao: "nao-gostei" });
    expect(troca.error).toBeNull();
    const fila = await a.cliente
      .from("lista_itens")
      .upsert({ ...item(a.id, "serie"), status: "quero_assistir" });
    expect(fila.error).toBeNull();

    const reacoes = await a.cliente.from("reacoes").select("tipo, reacao, titulo").order("tipo");
    expect(reacoes.data).toEqual([
      { tipo: "filme", reacao: "amei", titulo: "Filme 1399" },
      { tipo: "serie", reacao: "nao-gostei", titulo: "Série 1399" },
    ]);
    const itens = await a.cliente.from("lista_itens").select("tipo, status").order("tipo");
    expect(itens.data).toEqual([
      { tipo: "filme", status: "assistido" },
      { tipo: "serie", status: "quero_assistir" },
    ]);
  });

  it("o banco recusa repetir usuário, tipo e tmdb_id, e tipo fora do enum", async () => {
    const repetida = await a.cliente.from("reacoes").insert(reacao(a.id, "serie"));
    expect(repetida.error?.code).toBe("23505");
    const repetido = await a.cliente.from("lista_itens").insert(item(a.id, "filme"));
    expect(repetido.error?.code).toBe("23505");

    const novela = await a.cliente
      .from("reacoes")
      .insert({ ...reacao(a.id), tmdb_id: 7, tipo: "novela" as never });
    expect(novela.error?.code).toBe("22P02");
    const livro = await a.cliente
      .from("lista_itens")
      .insert({ ...item(a.id), tmdb_id: 7, tipo: "livro" as never });
    expect(livro.error?.code).toBe("22P02");
  });

  it("RLS: B não lê as séries de A e ninguém grava série em nome de outra pessoa", async () => {
    const seriesVistasPorB = (tabela: "reacoes" | "lista_itens") =>
      b.cliente.from(tabela).select("tmdb_id").eq("tipo", "serie");
    expect((await seriesVistasPorB("reacoes")).data).toEqual([]);
    expect((await seriesVistasPorB("lista_itens")).data).toEqual([]);

    const reacaoAlheia = await b.cliente
      .from("reacoes")
      .insert({ ...reacao(a.id, "serie"), tmdb_id: 8 });
    expect(reacaoAlheia.error?.code).toBe("42501");
    const itemAlheio = await b.cliente
      .from("lista_itens")
      .insert({ ...item(a.id, "serie"), tmdb_id: 8 });
    expect(itemAlheio.error?.code).toBe("42501");
  });
});
