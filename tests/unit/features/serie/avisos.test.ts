import { describe, expect, it } from "vitest";

import { episodiosParaAvisar, textoDoAviso, type SerieComEpisodios } from "@/features/serie/avisos";
import type { EpisodioPrevisto } from "@/lib/tmdb/tipos";

const episodio = (sobrescrever: Partial<EpisodioPrevisto> = {}): EpisodioPrevisto => ({
  id: 901,
  nome: "Cold Harbor",
  temporadaNumero: 2,
  episodioNumero: 8,
  data: "2026-11-20",
  ...sobrescrever,
});

const serie = (sobrescrever: Partial<SerieComEpisodios> = {}): SerieComEpisodios => ({
  id: 95396,
  titulo: "Ruptura",
  ultimoEpisodioDetalhes: null,
  proximoEpisodioDetalhes: null,
  ...sobrescrever,
});

const linha = (sobrescrever: object = {}) => ({
  serie_tmdb_id: 95396,
  serie_titulo: "Ruptura",
  episodio_tmdb_id: 901,
  temporada_numero: 2,
  episodio_numero: 8,
  episodio_nome: "Cold Harbor",
  data_estreia: "2026-11-20",
  ...sobrescrever,
});

describe("episodiosParaAvisar", () => {
  it("o último exibido vira aviso se foi ao ar no dia do acompanhamento ou depois", () => {
    const ultimo = serie({ ultimoEpisodioDetalhes: episodio() });

    expect(episodiosParaAvisar(ultimo, "2026-11-18")).toEqual([linha()]);
    expect(episodiosParaAvisar(ultimo, "2026-11-20")).toEqual([linha()]);
  });

  it("o último exibido antes do acompanhamento não vira aviso", () => {
    expect(
      episodiosParaAvisar(serie({ ultimoEpisodioDetalhes: episodio() }), "2026-11-21"),
    ).toEqual([]);
  });

  it("o próximo com data vira aviso, mesmo antes do acompanhamento", () => {
    const proximo = episodio({ id: null, episodioNumero: 9, data: "2026-11-27" });

    expect(
      episodiosParaAvisar(
        serie({ ultimoEpisodioDetalhes: episodio(), proximoEpisodioDetalhes: proximo }),
        "2026-12-01",
      ),
    ).toEqual([linha({ episodio_tmdb_id: null, episodio_numero: 9, data_estreia: "2026-11-27" })]);
  });

  it("grava o último e o próximo juntos, e o mesmo episódio nos dois vira uma linha só", () => {
    const proximo = episodio({ episodioNumero: 9, data: "2026-11-27" });
    expect(
      episodiosParaAvisar(
        serie({ ultimoEpisodioDetalhes: episodio(), proximoEpisodioDetalhes: proximo }),
        "2026-11-01",
      ),
    ).toEqual([linha(), linha({ episodio_numero: 9, data_estreia: "2026-11-27" })]);

    const mesmo = episodio({ data: "2026-11-21" });
    expect(
      episodiosParaAvisar(
        serie({ ultimoEpisodioDetalhes: episodio(), proximoEpisodioDetalhes: mesmo }),
        "2026-11-01",
      ),
    ).toEqual([linha({ data_estreia: "2026-11-21" })]);
  });

  it.each<[string, Partial<EpisodioPrevisto>]>([
    ["sem data", { data: null }],
    ["data fora do formato", { data: "20/11/2026" }],
    ["sem temporada", { temporadaNumero: null }],
    ["dos especiais (temporada 0)", { temporadaNumero: 0 }],
    ["sem número", { episodioNumero: null }],
  ])("episódio %s não vira aviso", (_, sobrescrever) => {
    const ruim = episodio(sobrescrever);
    expect(
      episodiosParaAvisar(
        serie({ ultimoEpisodioDetalhes: ruim, proximoEpisodioDetalhes: ruim }),
        "2026-01-01",
      ),
    ).toEqual([]);
  });

  it("série sem episódios, ou sem título, não gera aviso", () => {
    expect(episodiosParaAvisar(serie(), "2026-01-01")).toEqual([]);
    expect(
      episodiosParaAvisar(
        serie({ titulo: " ", proximoEpisodioDetalhes: episodio() }),
        "2026-01-01",
      ),
    ).toEqual([]);
  });

  it("sem nome, o episódio vira 'Episódio N'; textos longos são cortados em 300", () => {
    const [gravada] = episodiosParaAvisar(
      serie({ titulo: "R".repeat(400), proximoEpisodioDetalhes: episodio({ nome: null }) }),
      "2026-01-01",
    );
    expect(gravada?.episodio_nome).toBe("Episódio 8");
    expect(gravada?.serie_titulo).toHaveLength(300);
  });
});

describe("textoDoAviso", () => {
  it("diz o episódio, a temporada e a série", () => {
    expect(
      textoDoAviso({
        id: "a",
        serieTmdbId: 95396,
        serieTitulo: "Ruptura",
        temporada: 2,
        episodio: 8,
        dataEstreia: "2026-11-20",
      }),
    ).toBe("Saiu o episódio 8 da temporada 2 de Ruptura");
  });
});
