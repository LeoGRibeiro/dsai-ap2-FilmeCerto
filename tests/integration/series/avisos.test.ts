import { beforeAll, describe, expect, it } from "vitest";

import { criarUsuario } from "../../support/supabase-local";

/** RLS de `avisos_episodios` (SPEC/2026-11-25-avisos-episodios.md). */
const SERIE = 1399;
const CHAVE = "usuario_id,serie_tmdb_id,temporada_numero,episodio_numero";

function aviso(usuarioId: string, sobrescrever: object = {}) {
  return {
    usuario_id: usuarioId,
    serie_tmdb_id: SERIE,
    serie_titulo: "Série 1399",
    temporada_numero: 2,
    episodio_numero: 8,
    episodio_nome: "Episódio 2x8",
    data_estreia: "2026-11-20",
    ...sobrescrever,
  };
}

describe("RLS dos avisos de episódio", () => {
  let a: Awaited<ReturnType<typeof criarUsuario>>;
  let b: Awaited<ReturnType<typeof criarUsuario>>;

  beforeAll(async () => {
    a = await criarUsuario("Usuária A");
    b = await criarUsuario("Usuário B");
    const { error } = await a.cliente
      .from("acompanhamentos_series")
      .insert({ usuario_id: a.id, serie_tmdb_id: SERIE, titulo: "Série 1399" });
    if (error) throw error;
  });

  it("a pessoa grava aviso de série que acompanha, e o upsert com data nova não duplica", async () => {
    const primeiro = await a.cliente.from("avisos_episodios").upsert(aviso(a.id), {
      onConflict: CHAVE,
    });
    expect(primeiro.error).toBeNull();

    const marcado = await a.cliente
      .from("avisos_episodios")
      .update({ lido_em: new Date().toISOString() })
      .eq("serie_tmdb_id", SERIE)
      .select("id");
    expect(marcado.data).toHaveLength(1);

    const segundo = await a.cliente
      .from("avisos_episodios")
      .upsert(aviso(a.id, { data_estreia: "2026-11-22" }), { onConflict: CHAVE });
    expect(segundo.error).toBeNull();

    const { data } = await a.cliente
      .from("avisos_episodios")
      .select("data_estreia, lido_em")
      .eq("serie_tmdb_id", SERIE);
    expect(data).toHaveLength(1);
    expect(data![0]!.data_estreia).toBe("2026-11-22");
    // `lido_em` fica fora do upsert e não volta a ser nulo.
    expect(data![0]!.lido_em).not.toBeNull();
  });

  it("ninguém grava aviso de série que não acompanha, nem para outra pessoa", async () => {
    const semAcompanhar = await a.cliente
      .from("avisos_episodios")
      .insert(aviso(a.id, { serie_tmdb_id: 1400 }));
    expect(semAcompanhar.error?.code).toBe("42501");

    const paraOutra = await b.cliente.from("avisos_episodios").insert(aviso(a.id));
    expect(paraOutra.error?.code).toBe("42501");

    // B não acompanha a série, então nem para si mesmo grava.
    const deB = await b.cliente.from("avisos_episodios").insert(aviso(b.id));
    expect(deB.error?.code).toBe("42501");
  });

  it("outra pessoa não lê, não marca como lido e não apaga o aviso", async () => {
    expect((await b.cliente.from("avisos_episodios").select("id")).data).toEqual([]);

    const marcado = await b.cliente
      .from("avisos_episodios")
      .update({ lido_em: null })
      .eq("serie_tmdb_id", SERIE)
      .select("id");
    expect(marcado.data).toEqual([]);

    const apagado = await b.cliente
      .from("avisos_episodios")
      .delete()
      .eq("serie_tmdb_id", SERIE)
      .select("id");
    expect(apagado.data).toEqual([]);

    const deA = await a.cliente.from("avisos_episodios").select("lido_em");
    expect(deA.data).toHaveLength(1);
    expect(deA.data![0]!.lido_em).not.toBeNull();
  });

  it("a pessoa apaga os próprios avisos", async () => {
    const apagado = await a.cliente
      .from("avisos_episodios")
      .delete()
      .eq("serie_tmdb_id", SERIE)
      .select("id");
    expect(apagado.data).toHaveLength(1);
    expect((await a.cliente.from("avisos_episodios").select("id")).data).toEqual([]);
  });
});
