import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Clima } from "@/features/metricas/eventos";
import { recomendarNoite, type ApiNoite, type PerfilNoite } from "@/features/noite/recomendar";
import { TmdbErro } from "@/lib/tmdb/cliente";
import type { FilmeDetalhes, FilmeResumo, FiltrosDescoberta } from "@/lib/tmdb/tipos";

const NETFLIX = { id: 8, nome: "Netflix", logoPath: null };
const TERROR = 27;

function resumo(id: number, generos = [35]): FilmeResumo {
  return {
    id,
    titulo: `Filme ${id}`,
    tituloOriginal: `Filme ${id}`,
    sinopse: "",
    posterPath: `/p${id}.jpg`,
    backdropPath: null,
    generos,
    ano: 2020,
    nota: 7.5,
    votos: 1000,
    popularidade: 10,
  };
}

function detalhes(id: number): FilmeDetalhes {
  return {
    ...resumo(id),
    generos: [{ id: 35, nome: "Comédia" }],
    duracaoMin: 100,
    slogan: null,
    trailerYoutube: "abc",
    elenco: [],
    direcao: [],
    ondeAssistir: { link: "", assinatura: [NETFLIX], aluguel: [], compra: [] },
    parecidos: [],
  };
}

type Paginas = { streaming?: FilmeResumo[][]; geral?: FilmeResumo[][] };

/** TMDB falso: a consulta com provedores lê `streaming`, a outra lê `geral`, por página. */
function apiFalsa(paginas: Paginas, opcoes: { falhar?: boolean; semDetalhes?: number[] } = {}) {
  const chamadas: FiltrosDescoberta[] = [];
  const api: ApiNoite = {
    descobrirFilmes: vi.fn(async (filtros: FiltrosDescoberta = {}) => {
      chamadas.push(filtros);
      if (opcoes.falhar) throw new TmdbErro("TMDB respondeu 503", 503);
      const lista = (filtros.provedores ? paginas.streaming : paginas.geral) ?? [];
      return {
        itens: lista[(filtros.pagina ?? 1) - 1] ?? [],
        pagina: filtros.pagina ?? 1,
        totalPaginas: lista.length,
        totalResultados: lista.flat().length,
      };
    }),
    obterFilme: vi.fn(async (id: number) =>
      opcoes.semDetalhes?.includes(id) ? null : detalhes(id),
    ),
  };
  return { api, chamadas };
}

const respostas: Clima = { humor: "cansado", experiencia: "rir", companhia: "a-dois" };
const perfil: PerfilNoite = { generosEvitados: [], streamings: [8] };
const rodada0 = { tom: 0, duracaoMax: null, vistos: [], trocas: 0 };
const rodada1 = { ...rodada0, trocas: 1 };

const ids = (resultado: Awaited<ReturnType<typeof recomendarNoite>>) =>
  resultado ? [resultado.destaque, ...resultado.opcoes].map(({ filme }) => filme.id) : [];

describe("recomendarNoite", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("na primeira rodada devolve um filme, com motivo e onde assistir", async () => {
    const { api, chamadas } = apiFalsa({ streaming: [[resumo(1), resumo(2)]] });

    const resultado = await recomendarNoite({
      respostas,
      estado: rodada0,
      perfil,
      excluir: [],
      api,
    });

    expect(ids(resultado)).toEqual([1]);
    expect(resultado?.destaque.provedor).toEqual(NETFLIX);
    expect(resultado?.destaque.motivo).toBe(
      "Você está cansado, quer rir e vai ver a dois: comédia leve, nota 7,5, está na Netflix.",
    );
    expect(chamadas[0]).toMatchObject({ provedores: [8], todosGeneros: [35], duracaoMax: 110 });
  });

  it("depois de uma troca devolve 1 destaque e 2 opções", async () => {
    const { api } = apiFalsa({ streaming: [[resumo(1), resumo(2), resumo(3), resumo(4)]] });

    const resultado = await recomendarNoite({
      respostas,
      estado: rodada1,
      perfil,
      excluir: [],
      api,
    });

    expect(resultado?.destaque.filme.id).toBe(1);
    expect(resultado?.opcoes.map(({ filme }) => filme.id)).toEqual([2, 3]);
  });

  it("completa com a busca sem provedor quando os streamings não bastam", async () => {
    const { api, chamadas } = apiFalsa({
      streaming: [[resumo(1)]],
      geral: [[resumo(1), resumo(5), resumo(6)]],
    });

    const resultado = await recomendarNoite({
      respostas,
      estado: rodada1,
      perfil,
      excluir: [],
      api,
    });

    expect(ids(resultado)).toEqual([1, 5, 6]);
    expect(chamadas.map((f) => f.provedores)).toEqual([[8], undefined]);
  });

  it("sem streamings no perfil, busca direto sem provedor", async () => {
    const { api, chamadas } = apiFalsa({ geral: [[resumo(7)]] });

    await recomendarNoite({
      respostas,
      estado: rodada0,
      perfil: { ...perfil, streamings: [] },
      excluir: [],
      api,
    });

    expect(chamadas).toHaveLength(1);
    expect(chamadas[0]?.provedores).toBeUndefined();
  });

  it("nunca devolve excluído, já mostrado ou de gênero evitado, mesmo que o TMDB devolva", async () => {
    const { api } = apiFalsa({
      streaming: [
        [resumo(1), resumo(2), resumo(3, [35, TERROR])],
        [resumo(4), resumo(5), resumo(6)],
      ],
    });

    const resultado = await recomendarNoite({
      respostas,
      estado: { ...rodada1, vistos: [2, 4] },
      perfil: { ...perfil, generosEvitados: [TERROR] },
      excluir: [1],
      api,
    });

    expect(ids(resultado)).toEqual([5, 6]);
  });

  it("lê a 2ª página quando a 1ª não completa a rodada, e não passa do total de páginas", async () => {
    const { api, chamadas } = apiFalsa({ streaming: [[resumo(1)], [resumo(2), resumo(3)]] });

    const resultado = await recomendarNoite({
      respostas,
      estado: rodada1,
      perfil,
      excluir: [],
      api,
    });

    expect(ids(resultado)).toEqual([1, 2, 3]);
    expect(chamadas.map((f) => f.pagina)).toEqual([1, 2]);
  });

  it("descarta filme sem detalhes no TMDB", async () => {
    const { api } = apiFalsa(
      { streaming: [[resumo(1), resumo(2), resumo(3)]] },
      { semDetalhes: [1] },
    );

    const resultado = await recomendarNoite({
      respostas,
      estado: rodada1,
      perfil,
      excluir: [],
      api,
    });

    expect(ids(resultado)).toEqual([2, 3]);
  });

  it("usa as respostas recebidas mesmo quando o estado inteiro da URL é passado", async () => {
    const { api, chamadas } = apiFalsa({ streaming: [[resumo(1)]] });
    const estadoDaUrl = { ...rodada0, respostas: {} };

    const resultado = await recomendarNoite({
      respostas,
      estado: estadoDaUrl,
      perfil,
      excluir: [],
      api,
    });

    expect(chamadas[0]?.todosGeneros).toEqual([35]);
    expect(resultado?.destaque.motivo).toMatch(/^Você está cansado, quer rir/);
  });

  it("devolve null sem candidatos", async () => {
    const { api } = apiFalsa({ streaming: [[resumo(1)]] });

    expect(
      await recomendarNoite({ respostas, estado: rodada0, perfil, excluir: [1], api }),
    ).toBeNull();
  });

  it("devolve null quando todos os tons da experiência são evitados, sem chamar o TMDB", async () => {
    const { api } = apiFalsa({ streaming: [[resumo(1)]] });

    const resultado = await recomendarNoite({
      respostas: { ...respostas, experiencia: "susto" },
      estado: rodada0,
      perfil: { ...perfil, generosEvitados: [TERROR] },
      excluir: [],
      api,
    });

    expect(resultado).toBeNull();
    expect(api.descobrirFilmes).not.toHaveBeenCalled();
  });

  it("não lança quando o TMDB falha", async () => {
    const { api } = apiFalsa({}, { falhar: true });

    await expect(
      recomendarNoite({ respostas, estado: rodada0, perfil, excluir: [], api }),
    ).resolves.toBeNull();
  });
});
