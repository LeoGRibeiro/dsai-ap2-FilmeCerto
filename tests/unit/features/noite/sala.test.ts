import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiNoite } from "@/features/noite/recomendar";
import { abrirSala, montarResultado } from "@/features/noite/sala";
import { TmdbErro } from "@/lib/tmdb/cliente";
import type { FilmeDetalhes, FilmeResumo } from "@/lib/tmdb/tipos";

import { bancoFalso, RIR, SALA, TENSO } from "./banco-sala";

const linhaDaSala = (sobrescrever: object = {}) => ({
  convidado_id: null,
  respostas_criador: null,
  respostas_convidado: null,
  resultado: null,
  ...sobrescrever,
});

describe("abrirSala", () => {
  it("ID que não é UUID conta como inexistente, sem ir ao banco", async () => {
    const { cliente, rpc } = bancoFalso({});
    expect(await abrirSala(cliente, "../dashboard")).toEqual({
      tipo: "indisponivel",
      motivo: "inexistente",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each(["cheia", "expirada", "inexistente"] as const)("sala %s fica indisponível", async (m) => {
    const { cliente } = bancoFalso({ entrar_sala_noite: { data: m } });
    expect(await abrirSala(cliente, SALA)).toEqual({ tipo: "indisponivel", motivo: m });
  });

  it("segue as respostas: perguntas, esperando, montar e resultado", async () => {
    const abrir = (papel: string, linha: object) =>
      abrirSala(bancoFalso({ entrar_sala_noite: { data: papel } }, linha).cliente, SALA);

    expect(await abrir("criador", linhaDaSala())).toEqual({
      tipo: "perguntas",
      papel: "criador",
      convidadoEntrou: false,
    });
    expect(await abrir("criador", linhaDaSala({ respostas_criador: RIR }))).toEqual({
      tipo: "esperando",
      papel: "criador",
      convidadoEntrou: false,
    });
    expect(
      await abrir("convidado", linhaDaSala({ convidado_id: "u-2", respostas_criador: RIR })),
    ).toEqual({ tipo: "perguntas", papel: "convidado", convidadoEntrou: true });
    expect(
      await abrir("convidado", linhaDaSala({ respostas_criador: RIR, respostas_convidado: TENSO })),
    ).toEqual({ tipo: "montar" });

    const resultado = { filmes: [{ id: 35020, motivo: "Os dois querem rir: …" }] };
    expect(await abrir("convidado", linhaDaSala({ resultado }))).toEqual({
      tipo: "resultado",
      resultado,
    });
  });

  it("sala que expirou entre a entrada e a leitura aparece como expirada", async () => {
    const { cliente } = bancoFalso({ entrar_sala_noite: { data: "criador" } }, null);
    expect(await abrirSala(cliente, SALA)).toEqual({ tipo: "indisponivel", motivo: "expirada" });
  });

  it("erro do banco vai para a tela de erro", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { cliente } = bancoFalso({
      entrar_sala_noite: { error: { code: "08006", message: "fora" } },
    });
    await expect(abrirSala(cliente, SALA)).rejects.toThrow("Não foi possível abrir a sala");
  });
});

function resumo(id: number): FilmeResumo {
  return {
    id,
    titulo: `Filme ${id}`,
    tituloOriginal: `Filme ${id}`,
    sinopse: "",
    posterPath: null,
    backdropPath: null,
    generos: [35],
    ano: 2020,
    nota: 7.1,
    votos: 1000,
    popularidade: 10,
  };
}

function apiFalsa(falhar = false): ApiNoite {
  return {
    descobrirFilmes: vi.fn(async () => {
      if (falhar) throw new TmdbErro("TMDB respondeu 503", 503);
      return { itens: [1, 2, 3, 4].map(resumo), pagina: 1, totalPaginas: 1, totalResultados: 4 };
    }),
    obterFilme: vi.fn(async (id: number): Promise<FilmeDetalhes> => ({
      ...resumo(id),
      generos: [],
      duracaoMin: 100,
      slogan: null,
      trailerYoutube: null,
      elenco: [],
      direcao: [],
      ondeAssistir: null,
      parecidos: [],
      classificacao: null,
    })),
  };
}

const restricoes = {
  data: [
    {
      respostas_criador: RIR,
      respostas_convidado: TENSO,
      evitados: [],
      streamings: [],
      excluir: [2],
    },
  ],
};

describe("montarResultado", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("grava os filmes de recomendarJuntos, com o motivo das duas pessoas", async () => {
    const { cliente, rpc } = bancoFalso({
      restricoes_sala_noite: restricoes,
      concluir_sala_noite: { data: true },
    });

    expect(await montarResultado(cliente, SALA, apiFalsa())).toEqual({ ok: true });
    const motivo =
      "Um quer rir e o outro quer ficar tenso: comédia de ação, nota 7,1, não está nos seus streamings.";
    expect(rpc).toHaveBeenCalledWith("concluir_sala_noite", {
      p_sala: SALA,
      p_resultado: {
        filmes: [
          { id: 1, motivo },
          { id: 3, motivo },
          { id: 4, motivo },
        ],
      },
    });
  });

  it("com o TMDB fora do ar, não grava nada e devolve a mensagem", async () => {
    const { cliente, rpc } = bancoFalso({ restricoes_sala_noite: restricoes });

    expect(await montarResultado(cliente, SALA, apiFalsa(true))).toEqual({
      ok: false,
      mensagem: "Não conseguimos buscar os filmes agora. Tente de novo em instantes.",
    });
    expect(rpc).not.toHaveBeenCalledWith("concluir_sala_noite", expect.anything());
  });

  it.each([
    ["algum dos dois tem filtro", { data: true }, "16"],
    [
      "a consulta do filtro falha (vale o mais seguro)",
      { error: { code: "08006", message: "fora" } },
      "16",
    ],
    ["ninguém tem filtro", { data: false }, undefined],
  ])("quando %s, o limite da descoberta é %s", async (_, resposta, limite) => {
    const api = apiFalsa();
    const { cliente } = bancoFalso({
      restricoes_sala_noite: restricoes,
      filtro_na_sala_noite: resposta,
      concluir_sala_noite: { data: true },
    });

    expect(await montarResultado(cliente, SALA, api)).toEqual({ ok: true });
    for (const [filtros] of vi.mocked(api.descobrirFilmes).mock.calls) {
      expect(filtros?.classificacaoMax).toBe(limite);
    }
  });

  it("sem as duas respostas (o resultado já foi gravado), não chama o TMDB", async () => {
    const api = apiFalsa();
    const { cliente, rpc } = bancoFalso({
      restricoes_sala_noite: { error: { code: "P0001", message: "sem respostas" } },
    });

    expect(await montarResultado(cliente, SALA, api)).toEqual({ ok: true });
    expect(api.descobrirFilmes).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
