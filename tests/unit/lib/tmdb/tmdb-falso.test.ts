// @vitest-environment node
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { criarClienteTmdb } from "@/lib/tmdb/cliente";
import { criarApiFilmes } from "@/lib/tmdb/filmes";
import { criarApiSeries } from "@/lib/tmdb/series";

/**
 * Contrato do TMDB falso dos testes E2E: as respostas de séries passam pelos esquemas do
 * cliente de verdade, para as telas de séries não quebrarem no E2E com "Resposta inesperada".
 */
const SERVIDOR = fileURLToPath(new URL("../../../e2e/tmdb-falso/servidor.mjs", import.meta.url));

async function portaLivre() {
  const sonda = createServer().listen(0, "127.0.0.1");
  await once(sonda, "listening");
  const { port } = sonda.address() as { port: number };
  sonda.close();
  return port;
}

describe("TMDB falso (tests/e2e/tmdb-falso) com o cliente de séries", () => {
  let processo: ChildProcess;
  let series: ReturnType<typeof criarApiSeries>;
  let filmes: ReturnType<typeof criarApiFilmes>;

  beforeAll(async () => {
    const porta = await portaLivre();
    processo = spawn(process.execPath, [SERVIDOR, String(porta)]);
    const [saida] = (await once(processo.stdout!, "data")) as [Buffer];
    expect(saida.toString()).toContain("TMDB falso em");

    const cliente = criarClienteTmdb({ token: "t", baseUrl: `http://127.0.0.1:${porta}/3` });
    series = criarApiSeries(cliente);
    filmes = criarApiFilmes(cliente);
  });

  afterAll(() => {
    processo?.kill();
  });

  it("descobrirSeries devolve séries do gênero pedido", async () => {
    const pagina = await series.descobrirSeries({ generos: [10765] });
    expect(pagina.itens).toHaveLength(20);
    expect(pagina.itens[0]).toMatchObject({
      titulo: "Série Sci-Fi & Fantasy 1-1",
      generos: [10765],
    });
  });

  it("obterSerie converte os detalhes, e um ID de 999000000 em diante é 404", async () => {
    expect(await series.obterSerie(1399)).toMatchObject({
      titulo: "Série 1399",
      duracaoEpisodioMin: 45,
      temporadas: [{ numero: 1 }, { numero: 2 }],
      trailerYoutube: "trailer-serie-falso",
      classificacao: "12",
      ondeAssistir: { assinatura: [{ nome: "Netflix" }] },
      situacao: "Returning Series",
      proximoEpisodio: "2099-12-12",
    });
    expect(await series.obterSerie(999000001)).toBeNull();
  });

  it("obterTemporada traz 8 episódios na 1, um sem duração e um não exibido; a 99 é 404", async () => {
    const temporada = await series.obterTemporada(1399, 1);
    expect(temporada).toMatchObject({ numero: 1, nome: "Temporada 1", ano: 2019 });
    expect(temporada?.episodios).toHaveLength(8);
    expect(temporada?.episodios[2]).toMatchObject({ numero: 3, duracaoMin: null });
    expect(temporada?.episodios[7]).toMatchObject({
      numero: 8,
      duracaoMin: null,
      data: "2099-12-12",
      nota: null,
    });
    expect((await series.obterTemporada(1399, 2))?.episodios).toHaveLength(8);
    expect(await series.obterTemporada(1399, 99)).toBeNull();
    expect(await series.obterTemporada(999000001, 1)).toBeNull();
  });

  it("generosSeries traz os gêneros de TV", async () => {
    expect(await series.generosSeries()).toContainEqual({ id: 10765, nome: "Sci-Fi & Fantasy" });
  });

  it('buscarSeries traz séries com o texto, que abrem nos detalhes; com "nada", vazio', async () => {
    const pagina = await series.buscarSeries("dark");
    expect(pagina).toMatchObject({ pagina: 1, totalPaginas: 3, totalResultados: 55 });
    expect(pagina.itens).toHaveLength(20);
    expect(pagina.itens[0]).toMatchObject({ titulo: "dark 1-1", generos: [10765] });
    expect(await series.obterSerie(pagina.itens[0]!.id)).not.toBeNull();
    expect((await series.buscarSeries("nada")).itens).toEqual([]);
  });

  it("a busca de filmes continua igual", async () => {
    const pagina = await filmes.buscarFilmes("matrix", 2);
    expect(pagina).toMatchObject({ pagina: 2, totalResultados: 55 });
    expect(pagina.itens[0]).toMatchObject({ id: 500040, titulo: "matrix 2-1", generos: [878] });
  });

  it("classificação: final 1 é 18, final 2 é 14, final 3 vem dos EUA (16), o resto não tem", async () => {
    const ids = [500021, 500022, 500023, 500024];
    expect(await Promise.all(ids.map((id) => filmes.classificacaoFilme(id)))).toEqual([
      "18",
      "14",
      "16",
      null,
    ]);
    expect(await filmes.obterFilme(500021)).toMatchObject({
      classificacao: "18",
      temas: { temas: ["violencia", "medo"], pais: "BR" },
    });
    expect((await filmes.obterFilme(500022))?.temas).toEqual({ temas: ["linguagem"], pais: "NL" });
    expect(await series.classificacaoSerie(1399)).toBe("12");
  });

  it("o mesmo ID é um filme e uma série diferentes", async () => {
    const [filme, serie] = await Promise.all([filmes.obterFilme(1399), series.obterSerie(1399)]);
    expect(filme?.titulo).toBe("Filme 1399");
    expect(serie?.titulo).toBe("Série 1399");
  });
});
