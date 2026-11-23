import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Clima } from "@/features/metricas/eventos";
import {
  NoiteIndisponivel,
  recomendarJuntos,
  recomendarNoite,
  type ApiNoite,
  type ApiNoiteSerie,
  type PerfilNoite,
} from "@/features/noite/recomendar";
import { TmdbErro } from "@/lib/tmdb/cliente";
import type {
  FilmeDetalhes,
  FilmeResumo,
  FiltrosDescoberta,
  SerieDetalhes,
} from "@/lib/tmdb/tipos";

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
    classificacao: null,
  };
}

type Paginas = { streaming?: FilmeResumo[][]; geral?: FilmeResumo[][] };

type Opcoes = {
  /** `true`: toda busca falha; `"streaming"`: só a busca com provedores falha. */
  falhar?: boolean | "streaming";
  detalhesFalham?: boolean;
  semDetalhes?: number[];
  /** Duração nos detalhes por ID (o padrão é 100 min). */
  duracoes?: Record<number, number | null>;
};

/** TMDB falso: a consulta com provedores lê `streaming`, a outra lê `geral`, por página. */
function apiFalsa(paginas: Paginas, opcoes: Opcoes = {}) {
  const chamadas: FiltrosDescoberta[] = [];
  const api: ApiNoite = {
    descobrirFilmes: vi.fn(async (filtros: FiltrosDescoberta = {}) => {
      chamadas.push(filtros);
      if (opcoes.falhar === true || (opcoes.falhar === "streaming" && filtros.provedores)) {
        throw new TmdbErro("TMDB respondeu 503", 503);
      }
      const lista = (filtros.provedores ? paginas.streaming : paginas.geral) ?? [];
      return {
        itens: lista[(filtros.pagina ?? 1) - 1] ?? [],
        pagina: filtros.pagina ?? 1,
        totalPaginas: lista.length,
        totalResultados: lista.flat().length,
      };
    }),
    obterFilme: vi.fn(async (id: number) => {
      if (opcoes.detalhesFalham) throw new TmdbErro("Sem resposta do TMDB", null);
      if (opcoes.semDetalhes?.includes(id)) return null;
      const duracao = opcoes.duracoes?.[id];
      return duracao === undefined ? detalhes(id) : { ...detalhes(id), duracaoMin: duracao };
    }),
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

  it("com 'Até que horas?', limita a busca e nunca devolve filme que passa do horário", async () => {
    const { api, chamadas } = apiFalsa(
      { streaming: [[resumo(1), resumo(2), resumo(3), resumo(4)]] },
      { duracoes: { 1: 95, 2: null, 3: 90 } },
    );

    const resultado = await recomendarNoite({
      respostas,
      estado: { ...rodada1, tempo: 90 },
      perfil,
      excluir: [],
      api,
    });

    expect(chamadas[0]).toMatchObject({ duracaoMax: 90 });
    // 1 é mais longo que o tempo e 2 não tem duração conhecida: só 3 cabe até a hora.
    expect(ids(resultado)).toEqual([3]);
  });

  it("sem 'Até que horas?', não confere a duração nos detalhes", async () => {
    const { api } = apiFalsa({ streaming: [[resumo(1)]] }, { duracoes: { 1: 180 } });

    const resultado = await recomendarNoite({
      respostas,
      estado: rodada0,
      perfil,
      excluir: [],
      api,
    });

    expect(ids(resultado)).toEqual([1]);
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

  it("segue com a busca geral quando só a dos streamings falha", async () => {
    const { api } = apiFalsa({ geral: [[resumo(5)]] }, { falhar: "streaming" });

    const resultado = await recomendarNoite({
      respostas,
      estado: rodada0,
      perfil,
      excluir: [],
      api,
    });

    expect(ids(resultado)).toEqual([5]);
  });

  it("lança NoiteIndisponivel quando o TMDB falha e nenhum filme sobra", async () => {
    const { api } = apiFalsa({}, { falhar: true });

    await expect(
      recomendarNoite({ respostas, estado: rodada0, perfil, excluir: [], api }),
    ).rejects.toThrow(NoiteIndisponivel);
  });

  it("lança NoiteIndisponivel quando os detalhes de todos os filmes falham", async () => {
    const { api } = apiFalsa({ streaming: [[resumo(1)]] }, { detalhesFalham: true });

    await expect(
      recomendarNoite({ respostas, estado: rodada0, perfil, excluir: [], api }),
    ).rejects.toThrow(NoiteIndisponivel);
  });
});

describe("recomendarJuntos", () => {
  const rir: Clima = { humor: "animado", experiencia: "rir", companhia: "a-dois" };
  const tenso: Clima = { humor: "cansado", experiencia: "tenso", companhia: "a-dois" };

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("devolve 1 destaque e 2 opções com o motivo das duas pessoas, sem os excluídos", async () => {
    const { api, chamadas } = apiFalsa({
      streaming: [[resumo(1), resumo(2)]],
      geral: [[resumo(2), resumo(3), resumo(4), resumo(5)]],
    });

    const resultado = await recomendarJuntos({
      a: rir,
      b: tenso,
      perfil: { generosEvitados: [], streamings: [8, 337] },
      excluir: [3],
      api,
    });

    expect(ids(resultado)).toEqual([1, 2, 4]);
    expect(resultado?.destaque.motivo).toBe(
      "Um quer rir e o outro quer ficar tenso: comédia de ação, nota 7,5, está na Netflix.",
    );
    expect(chamadas[0]).toMatchObject({
      provedores: [8, 337],
      todosGeneros: [35, 28],
      duracaoMax: 110,
    });
  });

  it("devolve null sem filme e lança quando o TMDB falha sem sobrar filme", async () => {
    const vazio = apiFalsa({ geral: [[]] });
    const semStreaming = { generosEvitados: [], streamings: [] };
    expect(
      await recomendarJuntos({
        a: rir,
        b: tenso,
        perfil: semStreaming,
        excluir: [],
        api: vazio.api,
      }),
    ).toBeNull();

    const fora = apiFalsa({}, { falhar: true });
    await expect(
      recomendarJuntos({ a: rir, b: tenso, perfil: semStreaming, excluir: [], api: fora.api }),
    ).rejects.toBeInstanceOf(NoiteIndisponivel);
  });

  it("com todos os tons evitados, nem consulta o TMDB", async () => {
    const { api } = apiFalsa({ geral: [[resumo(1)]] });
    const perfilEvita = { generosEvitados: [35, 28, 53], streamings: [] };

    expect(
      await recomendarJuntos({ a: rir, b: tenso, perfil: perfilEvita, excluir: [], api }),
    ).toBeNull();
    expect(api.descobrirFilmes).not.toHaveBeenCalled();
  });
});

describe("recomendarNoite de série", () => {
  function serieDetalhes(id: number, extra: Partial<SerieDetalhes> = {}): SerieDetalhes {
    return {
      ...resumo(id),
      titulo: `Série ${id}`,
      generos: [{ id: 35, nome: "Comédia" }],
      duracaoEpisodioMin: 30,
      temporadas: [],
      slogan: null,
      trailerYoutube: null,
      elenco: [],
      criacao: [],
      classificacao: "12",
      ondeAssistir: { link: "", assinatura: [NETFLIX], aluguel: [], compra: [] },
      ...extra,
    };
  }

  /** TMDB de séries falso: uma página de resultados e os detalhes de cada ID. */
  function apiSerieFalsa(
    itens: FilmeResumo[],
    detalhesPorId: Record<number, Partial<SerieDetalhes>> = {},
  ) {
    const chamadas: FiltrosDescoberta[] = [];
    const api: ApiNoiteSerie = {
      descobrirSeries: vi.fn(async (filtros = {}) => {
        chamadas.push(filtros);
        return { itens, pagina: 1, totalPaginas: 1, totalResultados: itens.length };
      }),
      obterSerie: vi.fn(async (id: number) => serieDetalhes(id, detalhesPorId[id])),
    };
    return { api, chamadas };
  }

  const semStreaming: PerfilNoite = { generosEvitados: [], streamings: [] };

  it("busca séries com os gêneros de TV e devolve a duração do episódio, sem tocar nos filmes", async () => {
    const { api, chamadas } = apiSerieFalsa([resumo(1)]);

    const resultado = await recomendarNoite({
      tipo: "serie",
      respostas,
      estado: rodada0,
      perfil: semStreaming,
      excluir: [],
      api,
    });

    expect(resultado?.destaque.filme).toMatchObject({ id: 1, titulo: "Série 1", duracaoMin: 30 });
    expect(resultado?.destaque.motivo).toBe(
      "Você está cansado, quer rir e vai ver a dois: comédia, nota 7,5, está na Netflix.",
    );
    expect(chamadas[0]).toMatchObject({ todosGeneros: [35], duracaoMax: 45 });
    expect(chamadas[0]?.semGeneros).toEqual(expect.arrayContaining([10763, 10764, 10767]));
  });

  it("em família, descarta série acima de 12 anos ou sem classificação e completa com as seguintes", async () => {
    const { api } = apiSerieFalsa(
      [1, 2, 3, 4, 5, 6].map((id) => resumo(id)),
      {
        1: { classificacao: "16" },
        2: { classificacao: null },
        3: { classificacao: "L" },
        4: { classificacao: "14" },
        5: { classificacao: "10" },
        6: { classificacao: "12" },
      },
    );

    const resultado = await recomendarNoite({
      tipo: "serie",
      respostas: { ...respostas, companhia: "familia" },
      estado: rodada1,
      perfil: semStreaming,
      excluir: [],
      api,
    });

    expect(ids(resultado)).toEqual([3, 5, 6]);
  });

  it("com 'Até que horas?', o episódio precisa terminar a tempo", async () => {
    const { api, chamadas } = apiSerieFalsa([resumo(1), resumo(2)], {
      1: { duracaoEpisodioMin: 50 },
      2: { duracaoEpisodioMin: 22 },
    });

    const resultado = await recomendarNoite({
      tipo: "serie",
      respostas: { ...respostas, humor: "animado" },
      estado: { ...rodada0, tempo: 40 },
      perfil: semStreaming,
      excluir: [],
      api,
    });

    expect(chamadas[0]).toMatchObject({ duracaoMax: 40 });
    expect(ids(resultado)).toEqual([2]);
  });

  it("confere os evitados nos gêneros de TV, mesmo se o TMDB devolver", async () => {
    // Ação (28) evitada vira Action & Adventure (10759) nas séries.
    const { api } = apiSerieFalsa([resumo(1, [10759, 35]), resumo(2, [35])]);

    const resultado = await recomendarNoite({
      tipo: "serie",
      respostas,
      estado: rodada0,
      perfil: { ...semStreaming, generosEvitados: [28] },
      excluir: [],
      api,
    });

    expect(ids(resultado)).toEqual([2]);
  });
});
