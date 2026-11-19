import { describe, expect, it } from "vitest";

import type { Clima } from "@/features/metricas/eventos";
import { filtrosDaNoite, type RodadaNoite } from "@/features/noite/filtros";

// Gêneros de TV do TMDB (/genre/tv/list).
const ACAO_AVENTURA = 10759;
const ANIMACAO = 16;
const COMEDIA = 35;
const CRIME = 80;
const DRAMA = 18;
const MISTERIO = 9648;
const FICCAO_FANTASIA = 10765;
const GUERRA_POLITICA = 10768;
const NEWS_REALITY_TALK = [10763, 10764, 10767];

const base: Clima = { humor: "animado", experiencia: "rir", companhia: "sozinho" };

function filtrar(
  respostas: Partial<Clima>,
  extra: Partial<RodadaNoite> = {},
  evitados: number[] = [],
) {
  return filtrosDaNoite(
    { respostas: { ...base, ...respostas }, tom: 0, duracaoMax: null, tipo: "serie", ...extra },
    evitados,
  );
}

describe("filtrosDaNoite de série: experiência e tom", () => {
  it.each([
    ["rir", "comédia", [COMEDIA]],
    ["emocionar", "drama", [DRAMA]],
    ["susto", "mistério sobrenatural", [MISTERIO, FICCAO_FANTASIA]],
    ["tenso", "policial", [CRIME]],
    ["pensar", "ficção científica", [FICCAO_FANTASIA]],
    ["distrair", "aventura", [ACAO_AVENTURA]],
  ] as const)("%s começa no tom %s, com gêneros de TV", (experiencia, nome, generos) => {
    const resultado = filtrar({ experiencia });
    expect(resultado?.tom.nome).toBe(nome);
    expect(resultado?.filtros.todosGeneros).toEqual(generos);
  });

  it.each([
    [1, "comédia animada", [ANIMACAO, COMEDIA]],
    [2, "comédia dramática", [COMEDIA, DRAMA]],
    [3, "comédia", [COMEDIA]],
  ])("o tom %i de rir é %s (volta ao 1º depois do último)", (tom, nome, generos) => {
    const resultado = filtrar({ experiencia: "rir" }, { tom });
    expect(resultado?.tom.nome).toBe(nome);
    expect(resultado?.filtros.todosGeneros).toEqual(generos);
  });

  it("toda série exclui News, Reality e Talk, e rir exclui crime, mistério e guerra", () => {
    expect(filtrar({ experiencia: "rir" })?.filtros.semGeneros).toEqual([
      CRIME,
      MISTERIO,
      GUERRA_POLITICA,
      ...NEWS_REALITY_TALK,
    ]);
    expect(filtrar({ experiencia: "emocionar" })?.filtros.semGeneros).toEqual(NEWS_REALITY_TALK);
  });
});

describe("filtrosDaNoite de série: humor e companhia", () => {
  it("cansado limita o episódio a 45 min e ordena por popularidade", () => {
    const { filtros } = filtrar({ humor: "cansado" })!;
    expect(filtros.duracaoMax).toBe(45);
    expect(filtros.ordem).toBe("popularidade");
  });

  it("o limite do 'Muito longo' e o do 'Até que horas?' valem para o episódio, o menor vence", () => {
    expect(filtrar({ humor: "cansado" }, { duracaoMax: 30 })?.filtros.duracaoMax).toBe(30);
    expect(filtrar({ humor: "cansado" }, { tempo: 40 })?.filtros.duracaoMax).toBe(40);
  });

  it.each(["pra-baixo", "ansioso"] as const)(
    "%s exclui os pesados de TV, menos o gênero do tom",
    (humor) => {
      expect(filtrar({ humor, experiencia: "emocionar" })?.filtros.semGeneros).toEqual([
        CRIME,
        MISTERIO,
        GUERRA_POLITICA,
        ...NEWS_REALITY_TALK,
      ]);
      const susto = filtrar({ humor, experiencia: "susto" })!;
      expect(susto.filtros.todosGeneros).toContain(MISTERIO);
      expect(susto.filtros.semGeneros).not.toContain(MISTERIO);
    },
  );

  it("nostálgico busca séries que estrearam até 2005", () => {
    expect(filtrar({ humor: "nostalgico" })?.filtros.lancadoAte).toBe("2005-12-31");
  });

  it("família não manda a classificação ao TMDB e pede a conferência até 12 anos", () => {
    const resultado = filtrar({ companhia: "familia" })!;
    expect(resultado.filtros).not.toHaveProperty("classificacaoMax");
    expect(resultado.classificacaoNosDetalhes).toBe("12");
    expect(filtrar({ companhia: "a-dois" })?.classificacaoNosDetalhes).toBeNull();
  });

  it("o piso de qualidade é o mesmo dos filmes", () => {
    expect(filtrar({})?.filtros).toMatchObject({ notaMin: 6.5, votosMin: 300, ordem: "nota" });
  });
});

describe("filtrosDaNoite de série: gêneros evitados do perfil", () => {
  it("converte os evitados de filme para os gêneros de TV", () => {
    // Ação 28 e Aventura 12 → Action & Adventure; Fantasia 14 → Sci-Fi & Fantasy;
    // Drama 18 é o mesmo ID; Romance 10749 não tem equivalente.
    const resultado = filtrar({ experiencia: "rir" }, {}, [28, 12, 14, 18, 10749])!;
    expect(resultado.evitados).toEqual([ACAO_AVENTURA, FICCAO_FANTASIA, DRAMA]);
    expect(resultado.filtros.semGeneros).toEqual(
      expect.arrayContaining([ACAO_AVENTURA, FICCAO_FANTASIA, DRAMA]),
    );
    expect(resultado.filtros.semGeneros).not.toContain(10749);
  });

  it("pula o tom que exige um gênero evitado", () => {
    // Ficção científica evitada: "pensar" pula a ficção e vai ao mistério.
    expect(filtrar({ experiencia: "pensar" }, {}, [878])?.tom.nome).toBe("mistério");
  });

  it("terror evitado deixa o susto de série sem tom", () => {
    expect(filtrar({ experiencia: "susto" }, {}, [27])).toBeNull();
    expect(filtrar({ experiencia: "rir" }, {}, [27])).not.toBeNull();
  });

  it("sem tipo, continua usando as tabelas de filme", () => {
    const filme = filtrosDaNoite(
      { respostas: { ...base, companhia: "familia" }, tom: 0, duracaoMax: null },
      [],
    )!;
    expect(filme.filtros.todosGeneros).toEqual([35]);
    expect(filme.filtros.classificacaoMax).toBe("12");
    expect(filme.classificacaoNosDetalhes).toBeNull();
  });
});
