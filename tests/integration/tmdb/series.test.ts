import { describe, expect, it } from "vitest";

import { criarClienteTmdb } from "@/lib/tmdb/cliente";
import { criarApiSeries } from "@/lib/tmdb/series";

import { TOKEN_TMDB_REAL } from "../../support/tmdb-real";

describe.skipIf(!TOKEN_TMDB_REAL)("cliente de séries contra a API real do TMDB", () => {
  const api = criarApiSeries(
    criarClienteTmdb({ token: TOKEN_TMDB_REAL ?? "", baseUrl: "https://api.themoviedb.org/3" }),
  );

  it("descobrirSeries com Drama devolve só séries de drama", async () => {
    const pagina = await api.descobrirSeries({ generos: [18] });
    expect(pagina.itens.length).toBeGreaterThan(0);
    for (const serie of pagina.itens) expect(serie.generos).toContain(18);
  });

  it("obterSerie(1399) devolve Game of Thrones com temporadas e duração do episódio", async () => {
    const serie = await api.obterSerie(1399);
    expect(serie?.titulo).toBeTruthy();
    expect(serie?.temporadas.length).toBeGreaterThan(0);
    expect(serie?.duracaoEpisodioMin).toBeGreaterThan(0);
  });

  it("obterSerie de um ID inexistente devolve null", async () => {
    expect(await api.obterSerie(999999999)).toBeNull();
  });

  it("generosSeries traz gêneros só de TV, como Sci-Fi & Fantasy (10765)", async () => {
    const generos = await api.generosSeries();
    expect(generos.map((genero) => genero.id)).toContain(10765);
  });
});
