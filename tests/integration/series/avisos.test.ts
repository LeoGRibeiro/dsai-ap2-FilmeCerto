import { beforeAll, describe, expect, it } from "vitest";

import { diaEmSaoPaulo } from "@/features/recomendacao/semente";
import type { SerieComEpisodios } from "@/features/serie/avisos";
import { obterAvisosNaoLidos } from "@/features/serie/consultas";
import { definirAcompanhamento, gerarAvisos, marcarLido } from "@/features/serie/gravar";

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

describe("gerarAvisos e obterAvisosNaoLidos no Supabase local", () => {
  const hoje = diaEmSaoPaulo(new Date());
  const serie = (proximaData: string): SerieComEpisodios => ({
    id: 2316,
    titulo: "The Office",
    ultimoEpisodioDetalhes: {
      id: 1,
      nome: "Piloto",
      temporadaNumero: 1,
      episodioNumero: 1,
      data: hoje,
    },
    proximoEpisodioDetalhes: {
      id: 2,
      nome: null,
      temporadaNumero: 1,
      episodioNumero: 2,
      data: proximaData,
    },
  });

  it("grava o episódio de hoje e o futuro, mostra só o de hoje e não duplica com data nova", async () => {
    const c = await criarUsuario("Usuária C");
    const { error } = await c.cliente
      .from("acompanhamentos_series")
      .insert({ usuario_id: c.id, serie_tmdb_id: 2316, titulo: "The Office" });
    if (error) throw error;

    await gerarAvisos(c.cliente, c.id, async () => serie("2099-01-01"));
    await gerarAvisos(c.cliente, c.id, async () => serie("2099-02-01"));

    const gravados = await c.cliente
      .from("avisos_episodios")
      .select("episodio_numero, data_estreia")
      .order("episodio_numero");
    expect(gravados.data).toEqual([
      { episodio_numero: 1, data_estreia: hoje },
      { episodio_numero: 2, data_estreia: "2099-02-01" },
    ]);

    const naoLidos = await obterAvisosNaoLidos(c.cliente, c.id, hoje);
    expect(naoLidos).toEqual([
      expect.objectContaining({ serieTitulo: "The Office", temporada: 1, episodio: 1 }),
    ]);

    expect(await marcarLido(c.cliente, c.id, naoLidos[0]!.id)).toBe(true);
    await gerarAvisos(c.cliente, c.id, async () => serie("2099-02-01"));
    expect(await obterAvisosNaoLidos(c.cliente, c.id, hoje)).toEqual([]);

    expect(await definirAcompanhamento(c.cliente, c.id, 2316, false)).toEqual({ ok: true });
    expect((await c.cliente.from("avisos_episodios").select("id")).data).toEqual([]);
  });
});
