import { afterEach, describe, expect, it, vi } from "vitest";

import { obterAvisosNaoLidos } from "@/features/serie/consultas";

import { bancoEmMemoria } from "../../../support/banco-memoria";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const USUARIO = "u-1";

const aviso = (id: string, sobrescrever: object = {}) => ({
  id,
  usuario_id: USUARIO,
  serie_tmdb_id: 95396,
  serie_titulo: "Ruptura",
  temporada_numero: 2,
  episodio_numero: 8,
  data_estreia: "2026-11-20",
  lido_em: null,
  ...sobrescrever,
});

afterEach(() => vi.restoreAllMocks());

describe("obterAvisosNaoLidos", () => {
  it("traz só os não lidos da pessoa com estreia até hoje", async () => {
    const banco = bancoEmMemoria({
      avisos_episodios: [
        aviso("hoje", { data_estreia: "2026-11-25" }),
        aviso("futuro", { data_estreia: "2026-11-26" }),
        aviso("lido", { lido_em: "2026-11-21T10:00:00Z" }),
        aviso("de-outra", { usuario_id: "outra" }),
        aviso("antigo"),
      ],
    });

    expect(await obterAvisosNaoLidos(banco.cliente, USUARIO, "2026-11-25")).toEqual([
      {
        id: "hoje",
        serieTmdbId: 95396,
        serieTitulo: "Ruptura",
        temporada: 2,
        episodio: 8,
        dataEstreia: "2026-11-25",
      },
      expect.objectContaining({ id: "antigo", dataEstreia: "2026-11-20" }),
    ]);
  });

  it("respeita o limite", async () => {
    const banco = bancoEmMemoria({ avisos_episodios: [aviso("a"), aviso("b"), aviso("c")] });
    const avisos = await obterAvisosNaoLidos(banco.cliente, USUARIO, "2026-11-25", 2);
    expect(avisos.map(({ id }) => id)).toEqual(["a", "b"]);
  });

  it("erro do banco vira lista vazia", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const banco = bancoEmMemoria({}, { avisos_episodios: { code: "500", message: "falhou" } });
    expect(await obterAvisosNaoLidos(banco.cliente, USUARIO, "2026-11-25")).toEqual([]);
  });
});
