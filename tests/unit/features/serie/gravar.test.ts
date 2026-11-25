import { afterEach, describe, expect, it, vi } from "vitest";

import {
  definirAcompanhamento,
  gerarAvisos,
  LIMITE_SERIES_AVISOS,
  marcarLido,
} from "@/features/serie/gravar";
import type { SerieComEpisodios } from "@/features/serie/avisos";

import { bancoEmMemoria } from "../../../support/banco-memoria";

const USUARIO = "u-1";
const ERRO = { code: "500", message: "falhou" };

/** Acompanhada às 12h de 18/11 em São Paulo (15h UTC). */
const acompanhamento = (serieTmdbId: number) => ({
  usuario_id: USUARIO,
  serie_tmdb_id: serieTmdbId,
  criado_em: "2026-11-18T15:00:00+00:00",
});

const serie = (id: number, data: string): SerieComEpisodios => ({
  id,
  titulo: `Série ${id}`,
  proximoEpisodioDetalhes: null,
  ultimoEpisodioDetalhes: { id: null, nome: null, temporadaNumero: 1, episodioNumero: 5, data },
});

afterEach(() => vi.restoreAllMocks());

describe("gerarAvisos", () => {
  it("grava com upsert pela chave única os episódios a partir do dia do acompanhamento", async () => {
    const banco = bancoEmMemoria({
      acompanhamentos_series: [acompanhamento(1), acompanhamento(2)],
    });
    const buscarSerie = vi.fn(async (id: number) =>
      serie(id, id === 1 ? "2026-11-18" : "2026-11-17"),
    );

    await gerarAvisos(banco.cliente, USUARIO, buscarSerie);

    expect(buscarSerie.mock.calls.map(([id]) => id)).toEqual([1, 2]);
    expect(banco.escritas).toEqual([
      {
        tabela: "avisos_episodios",
        op: "upsert",
        valor: [
          {
            usuario_id: USUARIO,
            serie_tmdb_id: 1,
            serie_titulo: "Série 1",
            episodio_tmdb_id: null,
            temporada_numero: 1,
            episodio_numero: 5,
            episodio_nome: "Episódio 5",
            data_estreia: "2026-11-18",
          },
        ],
        opcoes: { onConflict: "usuario_id,serie_tmdb_id,temporada_numero,episodio_numero" },
        filtros: [],
      },
    ]);
  });

  it("série com o TMDB fora do ar, ou que virou 404, fica de fora sem impedir as outras", async () => {
    const banco = bancoEmMemoria({
      acompanhamentos_series: [acompanhamento(1), acompanhamento(2), acompanhamento(3)],
    });
    const buscarSerie = async (id: number) => {
      if (id === 1) throw new Error("TMDB fora do ar");
      return id === 2 ? null : serie(id, "2026-11-20");
    };

    await gerarAvisos(banco.cliente, USUARIO, buscarSerie);

    const [escrita] = banco.escritas;
    expect((escrita?.valor as { serie_tmdb_id: number }[]).map((l) => l.serie_tmdb_id)).toEqual([
      3,
    ]);
  });

  it("sem episódio para avisar, não escreve nada", async () => {
    const banco = bancoEmMemoria({ acompanhamentos_series: [acompanhamento(1)] });

    await gerarAvisos(banco.cliente, USUARIO, async (id) => serie(id, "2026-01-01"));

    expect(banco.escritas).toEqual([]);
  });

  it("lê no máximo LIMITE_SERIES_AVISOS séries, só da pessoa", async () => {
    const banco = bancoEmMemoria({
      acompanhamentos_series: [
        { ...acompanhamento(999), usuario_id: "outra" },
        ...Array.from({ length: LIMITE_SERIES_AVISOS + 5 }, (_, i) => acompanhamento(i + 1)),
      ],
    });
    const buscarSerie = vi.fn(async () => null);

    await gerarAvisos(banco.cliente, USUARIO, buscarSerie);

    expect(buscarSerie).toHaveBeenCalledTimes(LIMITE_SERIES_AVISOS);
    expect(buscarSerie).not.toHaveBeenCalledWith(999);
  });

  it("erro do banco na leitura ou na gravação vai para o log e não lança", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const buscarSerie = vi.fn(async (id: number) => serie(id, "2026-11-20"));

    const leitura = bancoEmMemoria({}, { acompanhamentos_series: ERRO });
    await expect(gerarAvisos(leitura.cliente, USUARIO, buscarSerie)).resolves.toBeUndefined();
    expect(buscarSerie).not.toHaveBeenCalled();

    const gravacao = bancoEmMemoria(
      { acompanhamentos_series: [acompanhamento(1)] },
      { avisos_episodios: ERRO },
    );
    await expect(gerarAvisos(gravacao.cliente, USUARIO, buscarSerie)).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith("[serie] falha ao gravar avisos:", "500");
  });
});

describe("definirAcompanhamento ao deixar de acompanhar", () => {
  it("apaga os avisos da série e depois o acompanhamento", async () => {
    const banco = bancoEmMemoria({
      acompanhamentos_series: [acompanhamento(1), acompanhamento(2)],
      avisos_episodios: [
        { usuario_id: USUARIO, serie_tmdb_id: 1 },
        { usuario_id: USUARIO, serie_tmdb_id: 2 },
      ],
    });

    expect(await definirAcompanhamento(banco.cliente, USUARIO, 1, false)).toEqual({ ok: true });

    expect(banco.escritas.map(({ tabela, op }) => `${op} ${tabela}`)).toEqual([
      "delete avisos_episodios",
      "delete acompanhamentos_series",
    ]);
    expect(banco.tabelas.avisos_episodios).toEqual([{ usuario_id: USUARIO, serie_tmdb_id: 2 }]);
    expect(banco.tabelas.acompanhamentos_series).toEqual([acompanhamento(2)]);
  });

  it("se os avisos não saem, o acompanhamento fica", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const banco = bancoEmMemoria(
      { acompanhamentos_series: [acompanhamento(1)] },
      { avisos_episodios: ERRO },
    );

    expect(await definirAcompanhamento(banco.cliente, USUARIO, 1, false)).toEqual({
      ok: false,
      erro: "banco",
    });
    expect(banco.tabelas.acompanhamentos_series).toEqual([acompanhamento(1)]);
  });
});

describe("marcarLido", () => {
  it("preenche lido_em só no aviso não lido da pessoa", async () => {
    const banco = bancoEmMemoria({
      avisos_episodios: [
        { id: "a", usuario_id: USUARIO, lido_em: null },
        { id: "a", usuario_id: "outra", lido_em: null },
      ],
    });

    expect(await marcarLido(banco.cliente, USUARIO, "a")).toBe(true);

    const [minha, deOutra] = banco.tabelas.avisos_episodios!;
    expect(minha?.lido_em).toEqual(expect.any(String));
    expect(deOutra?.lido_em).toBeNull();
  });

  it("erro do banco devolve false", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const banco = bancoEmMemoria({}, { avisos_episodios: ERRO });
    expect(await marcarLido(banco.cliente, USUARIO, "a")).toBe(false);
  });
});
