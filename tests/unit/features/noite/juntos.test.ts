import { describe, expect, it } from "vitest";

import type { Clima } from "@/features/metricas/eventos";
import { filtrosJuntos, motivoJuntos, tomJuntos } from "@/features/noite/juntos";

const COMEDIA = 35;
const TERROR = 27;
const THRILLER = 53;
const CRIME = 80;
const GUERRA = 10752;
const ACAO = 28;
const DRAMA = 18;

const base: Clima = { humor: "animado", experiencia: "rir", companhia: "a-dois" };
const pessoa = (respostas: Partial<Clima>): Clima => ({ ...base, ...respostas });
const NETFLIX = { id: 8, nome: "Netflix", logoPath: null };

describe("tomJuntos: o tom das duas experiências", () => {
  it.each([
    ["rir", "comédia leve"],
    ["susto", "terror"],
    ["distrair", "aventura"],
  ] as const)("%s + %s dá o tom 1 do wizard", (experiencia, nome) => {
    const tom = tomJuntos(pessoa({ experiencia }), pessoa({ experiencia }), []);
    expect(tom?.nome).toBe(nome);
  });

  it.each([
    ["rir", "comédia leve"],
    ["tenso", "suspense"],
    ["pensar", "ficção científica"],
  ] as const)("'só me distrair' com %s deixa a outra pessoa decidir (%s)", (outra, nome) => {
    const distrair = pessoa({ experiencia: "distrair" });
    expect(tomJuntos(distrair, pessoa({ experiencia: outra }), [])?.nome).toBe(nome);
    expect(tomJuntos(pessoa({ experiencia: outra }), distrair, [])?.nome).toBe(nome);
  });

  it.each([
    ["rir", "emocionar", "comédia dramática", [COMEDIA, DRAMA]],
    ["rir", "susto", "terror com humor", [TERROR, COMEDIA]],
    ["rir", "tenso", "comédia de ação", [COMEDIA, ACAO]],
    ["rir", "pensar", "comédia de ficção científica", [COMEDIA, 878]],
    ["emocionar", "susto", "terror dramático", [TERROR, DRAMA]],
    ["emocionar", "tenso", "drama policial", [DRAMA, CRIME]],
    ["emocionar", "pensar", "drama de ficção científica", [DRAMA, 878]],
    ["susto", "tenso", "terror de suspense", [TERROR, THRILLER]],
    ["susto", "pensar", "terror de ficção científica", [TERROR, 878]],
    ["tenso", "pensar", "suspense de mistério", [THRILLER, 9648]],
  ] as const)("%s + %s dá %s, nas duas ordens", (a, b, nome, generos) => {
    const ida = tomJuntos(pessoa({ experiencia: a }), pessoa({ experiencia: b }), []);
    const volta = tomJuntos(pessoa({ experiencia: b }), pessoa({ experiencia: a }), []);
    expect(ida).toEqual({ nome, generos });
    expect(volta).toEqual(ida);
  });

  it("com gênero evitado no tom do par, cai para o tom do criador e depois o da outra pessoa", () => {
    const rir = pessoa({ experiencia: "rir" });
    const tenso = pessoa({ experiencia: "tenso" });
    expect(tomJuntos(rir, tenso, [ACAO])?.nome).toBe("comédia leve");
    expect(tomJuntos(rir, tenso, [ACAO, COMEDIA])?.nome).toBe("suspense");
    expect(tomJuntos(rir, tenso, [ACAO, COMEDIA, THRILLER])).toBeNull();
  });
});

describe("filtrosJuntos: as restrições das duas pessoas", () => {
  const filtrar = (a: Partial<Clima>, b: Partial<Clima>, evitados: number[] = []) =>
    filtrosJuntos(pessoa(a), pessoa(b), evitados)?.filtros;

  it("as exclusões das experiências entram, menos os gêneros do tom", () => {
    const filtros = filtrar({ experiencia: "rir" }, { experiencia: "susto" });
    expect(filtros?.todosGeneros).toEqual([TERROR, COMEDIA]);
    expect(filtros?.semGeneros).toEqual(expect.arrayContaining([THRILLER, CRIME, GUERRA]));
    expect(filtros?.semGeneros).not.toContain(TERROR);
  });

  it("'cansado' de um lado limita a duração e ordena por popularidade", () => {
    const filtros = filtrar({ humor: "cansado" }, { humor: "animado" });
    expect(filtros).toMatchObject({ duracaoMax: 110, ordem: "popularidade" });
  });

  it("'nostálgico' de um lado limita a época", () => {
    expect(filtrar({ humor: "de-boa" }, { humor: "nostalgico" })?.lancadoAte).toBe("2005-12-31");
  });

  it("'pra baixo' de um lado exclui os pesados, menos o gênero do tom", () => {
    const filtros = filtrar(
      { humor: "pra-baixo", experiencia: "rir" },
      { humor: "animado", experiencia: "tenso" },
    );
    expect(filtros?.semGeneros).toEqual(expect.arrayContaining([TERROR, THRILLER, GUERRA]));

    const comTerror = filtrar(
      { humor: "pra-baixo", experiencia: "susto" },
      { experiencia: "susto" },
    );
    expect(comTerror?.semGeneros ?? []).not.toContain(TERROR);
    expect(comTerror?.semGeneros).toEqual(expect.arrayContaining([THRILLER, GUERRA]));
  });

  it("família de um lado só já limita a classificação", () => {
    expect(filtrar({ companhia: "familia" }, { companhia: "a-dois" })?.classificacaoMax).toBe("12");
    expect(filtrar({ companhia: "a-dois" }, { companhia: "a-dois" })?.classificacaoMax).toBe(
      undefined,
    );
  });

  it("'amigos' de um lado ordena por popularidade; sem ninguém pedir, ordena por nota", () => {
    expect(filtrar({ companhia: "amigos" }, {})?.ordem).toBe("popularidade");
    expect(filtrar({}, {})?.ordem).toBe("nota");
  });

  it("o piso de qualidade está sempre presente, e os evitados (união) sempre excluídos", () => {
    const filtros = filtrar({ experiencia: "emocionar" }, { experiencia: "pensar" }, [27, 99]);
    expect(filtros).toMatchObject({ notaMin: 6.5, votosMin: 300 });
    expect(filtros?.semGeneros).toEqual(expect.arrayContaining([27, 99]));
  });

  it("sem tom possível, não há filtro", () => {
    expect(filtrosJuntos(pessoa({ experiencia: "rir" }), pessoa({}), [COMEDIA])).toBeNull();
  });
});

describe("motivoJuntos", () => {
  const tom = { nome: "comédia de ação", generos: [COMEDIA, ACAO] };

  it("experiências diferentes: 'Um quer … e o outro quer …', na ordem do criador", () => {
    const motivo = motivoJuntos(
      pessoa({ experiencia: "rir" }),
      pessoa({ experiencia: "tenso" }),
      tom,
      { nota: 7.1 },
      NETFLIX,
    );
    expect(motivo).toBe(
      "Um quer rir e o outro quer ficar tenso: comédia de ação, nota 7,1, está na Netflix.",
    );
  });

  it("a mesma experiência: 'Os dois querem …'", () => {
    const motivo = motivoJuntos(
      pessoa({ experiencia: "susto" }),
      pessoa({ experiencia: "susto" }),
      { nome: "terror", generos: [TERROR] },
      { nota: 8 },
      null,
    );
    expect(motivo).toBe(
      "Os dois querem levar um susto: terror, nota 8,0, não está nos seus streamings.",
    );
  });

  it("com família de algum lado, lembra das crianças", () => {
    const motivo = motivoJuntos(
      pessoa({ experiencia: "distrair" }),
      pessoa({ experiencia: "rir", companhia: "familia" }),
      { nome: "comédia leve", generos: [COMEDIA] },
      { nota: 7.5 },
      NETFLIX,
    );
    expect(motivo).toBe(
      "Um quer só se distrair e o outro quer rir e tem criança no sofá: comédia leve, nota 7,5, está na Netflix.",
    );
  });
});
