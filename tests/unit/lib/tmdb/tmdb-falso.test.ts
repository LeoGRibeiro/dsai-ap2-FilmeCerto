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
    });
    expect(await series.obterSerie(999000001)).toBeNull();
  });

  it("generosSeries traz os gêneros de TV", async () => {
    expect(await series.generosSeries()).toContainEqual({ id: 10765, nome: "Sci-Fi & Fantasy" });
  });

  it("o mesmo ID é um filme e uma série diferentes", async () => {
    const [filme, serie] = await Promise.all([filmes.obterFilme(1399), series.obterSerie(1399)]);
    expect(filme?.titulo).toBe("Filme 1399");
    expect(serie?.titulo).toBe("Série 1399");
  });
});
