import { describe, expect, it } from "vitest";

import type { Clima } from "@/features/metricas/eventos";
import { filtrosDaNoite, type RodadaNoite } from "@/features/noite/filtros";

const TERROR = 27;
const THRILLER = 53;
const GUERRA = 10752;
const COMEDIA = 35;

const base: Clima = { humor: "animado", experiencia: "rir", companhia: "sozinho" };

function filtrar(
  respostas: Partial<Clima>,
  extra: Partial<RodadaNoite> = {},
  evitados: number[] = [],
) {
  return filtrosDaNoite(
    { respostas: { ...base, ...respostas }, tom: 0, duracaoMax: null, ...extra },
    evitados,
  );
}

describe("filtrosDaNoite: experiência e tom", () => {
  it.each([
    ["rir", "comédia leve", [35]],
    ["emocionar", "drama", [18]],
    ["susto", "terror", [27]],
    ["tenso", "suspense", [53]],
    ["pensar", "ficção científica", [878]],
    ["distrair", "aventura", [12]],
  ] as const)("%s começa no tom %s", (experiencia, nome, generos) => {
    const resultado = filtrar({ experiencia });
    expect(resultado?.tom.nome).toBe(nome);
    expect(resultado?.filtros.todosGeneros).toEqual(generos);
  });

  it.each([
    [1, "comédia romântica", [35, 10749]],
    [2, "comédia de aventura", [35, 12]],
    [3, "comédia leve", [35]],
  ])("o tom %i de rir é %s (volta ao 1º depois do último)", (tom, nome, generos) => {
    const resultado = filtrar({ experiencia: "rir" }, { tom });
    expect(resultado?.tom.nome).toBe(nome);
    expect(resultado?.filtros.todosGeneros).toEqual(generos);
  });

  it("rir exclui terror, thriller, crime e guerra mesmo sem humor pesado", () => {
    expect(filtrar({ experiencia: "rir" })?.filtros.semGeneros).toEqual([27, 53, 80, 10752]);
  });
});

describe("filtrosDaNoite: humor", () => {
  it("cansado limita a 110 min e ordena por popularidade", () => {
    const { filtros } = filtrar({ humor: "cansado" })!;
    expect(filtros.duracaoMax).toBe(110);
    expect(filtros.ordem).toBe("popularidade");
  });

  it("nostálgico busca filmes lançados até 2005", () => {
    expect(filtrar({ humor: "nostalgico" })?.filtros.lancadoAte).toBe("2005-12-31");
  });

  it.each(["pra-baixo", "ansioso"] as const)("%s exclui terror, thriller e guerra", (humor) => {
    const { filtros } = filtrar({ humor, experiencia: "emocionar" })!;
    expect(filtros.semGeneros).toEqual([TERROR, THRILLER, GUERRA]);
  });

  it("a experiência manda mais que o humor: pra baixo e tenso mantém o thriller", () => {
    const { filtros } = filtrar({ humor: "pra-baixo", experiencia: "tenso" })!;
    expect(filtros.todosGeneros).toEqual([THRILLER]);
    expect(filtros.semGeneros).toEqual([TERROR, GUERRA]);
  });

  it.each(["animado", "de-boa"] as const)("%s não muda nada", (humor) => {
    const { filtros } = filtrar({ humor, experiencia: "emocionar" })!;
    expect(filtros).toEqual({
      todosGeneros: [18],
      notaMin: 6.5,
      votosMin: 300,
      ordem: "nota",
    });
  });
});

describe("filtrosDaNoite: companhia", () => {
  it("família limita a classificação a 12 anos", () => {
    expect(filtrar({ companhia: "familia" })?.filtros.classificacaoMax).toBe("12");
  });

  it("amigos ordena por popularidade; sozinho e a dois por nota", () => {
    expect(filtrar({ companhia: "amigos" })?.filtros.ordem).toBe("popularidade");
    expect(filtrar({ companhia: "sozinho" })?.filtros.ordem).toBe("nota");
    expect(filtrar({ companhia: "a-dois" })?.filtros.classificacaoMax).toBeUndefined();
  });
});

describe("filtrosDaNoite: perfil e regras fixas", () => {
  it("sempre aplica o piso de nota 6,5 e 300 votos", () => {
    const { filtros } = filtrar({ humor: "cansado", companhia: "amigos" })!;
    expect(filtros.notaMin).toBe(6.5);
    expect(filtros.votosMin).toBe(300);
  });

  it("gêneros evitados vão sempre para semGeneros, sem repetir", () => {
    const { filtros } = filtrar({ experiencia: "rir" }, {}, [TERROR, 99])!;
    expect(filtros.semGeneros).toEqual([TERROR, 99, 53, 80, 10752]);
  });

  it("pula o tom que exige um gênero evitado", () => {
    // Quem evita Romance não recebe "comédia romântica": o tom 1 vira "comédia de aventura".
    const resultado = filtrar({ experiencia: "rir" }, { tom: 1 }, [10749]);
    expect(resultado?.tom.nome).toBe("comédia de aventura");
  });

  it("devolve null quando todos os tons da experiência são evitados", () => {
    expect(filtrar({ experiencia: "susto" }, {}, [TERROR])).toBeNull();
  });

  it("o limite do muito longo e o do cansado se combinam pelo menor", () => {
    expect(filtrar({ humor: "cansado" }, { duracaoMax: 95 })?.filtros.duracaoMax).toBe(95);
    expect(filtrar({ humor: "cansado" }, { duracaoMax: 130 })?.filtros.duracaoMax).toBe(110);
    expect(filtrar({ humor: "animado" }, { duracaoMax: 130 })?.filtros.duracaoMax).toBe(130);
  });

  it.each([
    ["só o horário", "animado", null, 90, 90],
    ["o horário é o menor", "cansado", 100, 90, 90],
    ["o muito longo é o menor", "cansado", 100, 300, 100],
    ["o cansado é o menor", "cansado", null, 300, 110],
    ["sem horário, como antes", "animado", null, null, undefined],
  ] as const)(
    "'Até que horas?' combina com os outros limites: %s",
    (_c, humor, max, tempo, esperado) => {
      const resultado = filtrar({ humor }, { duracaoMax: max, tempo });
      expect(resultado?.filtros.duracaoMax).toBe(esperado);
    },
  );

  it("'já passou' (tempo 0) também é um limite", () => {
    expect(filtrar({}, { tempo: 0 })?.filtros.duracaoMax).toBe(0);
  });

  it("os gêneros favoritos não entram nos filtros: só o tom define os gêneros", () => {
    const { filtros } = filtrar({ experiencia: "rir" })!;
    expect(filtros.generos).toBeUndefined();
    expect(filtros.todosGeneros).toEqual([COMEDIA]);
  });
});
