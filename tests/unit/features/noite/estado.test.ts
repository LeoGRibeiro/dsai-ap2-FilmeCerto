import { describe, expect, it } from "vitest";

import {
  comHorario,
  comJanela,
  ESTADO_INICIAL,
  inicioDaNoite,
  lerEstado,
  proximaPergunta,
  proximaRodada,
  respostasCompletas,
  urlComResposta,
  urlDaNoite,
  urlsDaTroca,
  type EstadoNoite,
} from "@/features/noite/estado";

const completo: EstadoNoite = {
  tipo: "filme",
  respostas: { humor: "cansado", experiencia: "rir", companhia: "a-dois" },
  tom: 1,
  duracaoMax: 100,
  vistos: [10, 20],
  trocas: 2,
  ate: null,
  tempo: null,
};

describe("lerEstado", () => {
  it("lê respostas, tom, duração, vistos e trocas válidos", () => {
    expect(
      lerEstado({
        humor: "cansado",
        exp: "rir",
        com: "a-dois",
        tom: "1",
        max: "100",
        vistos: "10,20",
        trocas: "2",
      }),
    ).toEqual(completo);
  });

  it("sem parâmetros, devolve o estado inicial", () => {
    expect(lerEstado({})).toEqual(ESTADO_INICIAL);
  });

  it.each([
    ["humor desconhecido", { humor: "feliz" }],
    ["experiência de outra pergunta", { exp: "cansado" }],
    ["resposta repetida na URL", { com: ["a-dois", "amigos"] }],
    ["tom fora da faixa", { tom: "3" }],
    ["tom negativo", { tom: "-1" }],
    ["duração abaixo do mínimo", { max: "40" }],
    ["duração que não é número", { max: "longo" }],
    ["trocas acima do limite", { trocas: "6" }],
    ["trocas com decimal", { trocas: "1.5" }],
    ["horário sem os minutos", { ate: "2215" }],
    ["minutos acima de um dia", { ate: "2215", tempo: "1441" }],
    ["minutos negativos", { ate: "2215", tempo: "-5" }],
  ])("ignora %s", (_caso, busca) => {
    expect(lerEstado(busca)).toEqual(ESTADO_INICIAL);
  });

  it("mantém só IDs inteiros positivos, sem repetir, nos vistos", () => {
    expect(lerEstado({ vistos: "5,abc,-3,5,7.5,9" }).vistos).toEqual([5, 9]);
  });

  it("guarda no máximo os 50 vistos mais recentes", () => {
    const ids = Array.from({ length: 60 }, (_, i) => i + 1);
    expect(lerEstado({ vistos: ids.join(",") }).vistos).toEqual(ids.slice(-50));
  });
});

describe("'Filme ou série?' no estado", () => {
  const serie: EstadoNoite = { ...completo, tipo: "serie", duracaoMax: 30 };

  it("lê tipo=serie e trata qualquer outro valor como filme", () => {
    expect(lerEstado({ tipo: "serie" })).toEqual({ ...ESTADO_INICIAL, tipo: "serie" });
    expect(lerEstado({ tipo: "novela" })).toEqual(ESTADO_INICIAL);
    expect(lerEstado({ tipo: ["serie", "serie"] })).toEqual(ESTADO_INICIAL);
  });

  it("escreve tipo=serie primeiro e volta pelo lerEstado", () => {
    const url = urlDaNoite(serie);
    expect(url).toBe(
      "/noite?tipo=serie&humor=cansado&exp=rir&com=a-dois&tom=1&max=30&vistos=10,20&trocas=2",
    );
    expect(lerEstado(Object.fromEntries(new URL(url, "http://x").searchParams))).toEqual(serie);
  });

  it("aceita episódio de 30 min no max só para série", () => {
    expect(lerEstado({ tipo: "serie", max: "30" }).duracaoMax).toBe(30);
    expect(lerEstado({ max: "30" }).duracaoMax).toBeNull();
    expect(lerEstado({ tipo: "serie", max: "15" }).duracaoMax).toBeNull();
  });

  it.each([
    ["usa 15 min a menos que o episódio recusado", null, 45, 30],
    ["sem duração nem limite, parte de 60 min", null, null, 45],
    ["nunca fica abaixo de 20 min", 30, 25, 20],
  ])("muito longo de série %s", (_caso, atual, recusado, esperado) => {
    const estado = { ...serie, duracaoMax: atual };
    const proximo = proximaRodada(estado, "muito-longo", [{ id: 1, duracaoMin: recusado }]);
    expect(proximo?.duracaoMax).toBe(esperado);
    expect(proximo?.tipo).toBe("serie");
  });

  it("inicioDaNoite refaz as perguntas mantendo o tipo", () => {
    expect(inicioDaNoite("serie")).toBe("/noite?tipo=serie");
    expect(inicioDaNoite("filme")).toBe("/noite");
  });
});

describe("'Até que horas?' no estado", () => {
  it("só os minutos são o tempo a partir de agora", () => {
    expect(lerEstado({ tempo: "120" })).toMatchObject({ ate: null, tempo: 120 });
  });

  it("o 'Outro horário' vem em HHMM, junto dos minutos", () => {
    expect(lerEstado({ ate: "2215", tempo: "45" })).toMatchObject({ ate: 1335, tempo: 45 });
    expect(lerEstado({ ate: "0000", tempo: "0" })).toMatchObject({ ate: 0, tempo: 0 });
  });

  it.each([
    ["hora cheia da versão anterior", "23"],
    ["hora acima de 23", "2460"],
    ["minuto acima de 59", "2275"],
    ["texto", "22h15"],
  ])("horário inválido (%s) fica só com os minutos", (_caso, ate) => {
    expect(lerEstado({ ate, tempo: "90" })).toMatchObject({ ate: null, tempo: 90 });
  });

  it("escreve o horário logo depois das respostas e volta pelo lerEstado", () => {
    const estado = { ...completo, ate: 60, tempo: 90 };
    const url = urlDaNoite(estado);
    expect(url).toBe(
      "/noite?humor=cansado&exp=rir&com=a-dois&ate=0100&tempo=90&tom=1&max=100&vistos=10,20&trocas=2",
    );
    expect(lerEstado(Object.fromEntries(new URL(url, "http://x").searchParams))).toEqual(estado);
  });

  it("comJanela põe só os minutos, e null é 'Tanto faz'", () => {
    const comHora = { ...completo, ate: 1335, tempo: 45 };
    expect(comJanela(comHora, 120)).toEqual({ ...completo, tempo: 120 });
    expect(urlDaNoite(comJanela(completo, 120))).toMatch(/&com=a-dois&tempo=120&tom=1/);
    expect(comJanela(comHora, null)).toEqual(completo);
  });

  it("comHorario calcula os minutos no relógio dado e mantém o resto do estado", () => {
    const agora = new Date(2026, 10, 18, 21, 30);
    expect(comHorario(completo, 22 * 60 + 15, agora)).toEqual({
      ...completo,
      ate: 1335,
      tempo: 45,
    });
    expect(comHorario(completo, 0, agora)).toEqual({ ...completo, ate: 0, tempo: 150 });
  });

  it("a próxima rodada mantém o horário", () => {
    const estado = { ...completo, ate: 1335, tempo: 45 };
    expect(proximaRodada(estado, "muito-longo", [{ id: 1, duracaoMin: 95 }])).toMatchObject({
      ate: 1335,
      tempo: 45,
    });
  });
});

describe("urlDaNoite", () => {
  it("é o caminho inverso de lerEstado", () => {
    const url = urlDaNoite(completo);
    expect(url).toBe("/noite?humor=cansado&exp=rir&com=a-dois&tom=1&max=100&vistos=10,20&trocas=2");
    const busca = Object.fromEntries(new URL(url, "http://x").searchParams);
    expect(lerEstado(busca)).toEqual(completo);
  });

  it("sem nada fora do padrão, é só /noite", () => {
    expect(urlDaNoite(ESTADO_INICIAL)).toBe("/noite");
  });

  it("urlComResposta acrescenta a resposta mantendo as anteriores", () => {
    const estado = lerEstado({ humor: "animado" });
    expect(urlComResposta(estado, "experiencia", "susto")).toBe("/noite?humor=animado&exp=susto");
  });
});

describe("proximaPergunta e respostasCompletas", () => {
  it("segue a ordem humor, experiência, companhia", () => {
    expect(proximaPergunta(ESTADO_INICIAL)?.chave).toBe("humor");
    expect(proximaPergunta(lerEstado({ humor: "animado" }))?.chave).toBe("experiencia");
    expect(proximaPergunta(lerEstado({ humor: "animado", exp: "rir" }))?.chave).toBe("companhia");
    expect(proximaPergunta(completo)).toBeNull();
  });

  it("pergunta o humor mesmo que a URL traga as outras respostas", () => {
    expect(proximaPergunta(lerEstado({ exp: "rir", com: "amigos" }))?.chave).toBe("humor");
  });

  it("só devolve as respostas quando as três existem", () => {
    expect(respostasCompletas(completo)).toEqual(completo.respostas);
    expect(respostasCompletas(lerEstado({ humor: "animado", exp: "rir" }))).toBeNull();
  });
});

describe("proximaRodada", () => {
  const mostrados = [
    { id: 30, duracaoMin: 125 },
    { id: 40, duracaoMin: 90 },
  ];
  const inicio = lerEstado({ humor: "cansado", exp: "rir", com: "a-dois" });

  it("soma os mostrados aos vistos e conta a troca", () => {
    const proximo = proximaRodada(completo, "outro", mostrados);
    expect(proximo).toEqual({ ...completo, vistos: [10, 20, 30, 40], trocas: 3 });
  });

  it("já vi só tira os filmes das próximas rodadas", () => {
    const proximo = proximaRodada(inicio, "ja-vi", mostrados);
    expect(proximo).toMatchObject({ tom: 0, duracaoMax: null, vistos: [30, 40], trocas: 1 });
  });

  it("não é o clima passa para o tom seguinte e volta ao primeiro", () => {
    expect(proximaRodada(inicio, "nao-e-o-clima", mostrados)?.tom).toBe(1);
    expect(proximaRodada({ ...inicio, tom: 2 }, "nao-e-o-clima", mostrados)?.tom).toBe(0);
  });

  it.each([
    ["usa 20 min a menos que o filme recusado", null, 125, 105],
    ["mantém o limite atual se ele já for menor", 100, 125, 100],
    ["sem duração conhecida, tira 20 min do limite atual", 110, null, 90],
    ["sem duração nem limite, parte de 120 min", null, null, 100],
    ["nunca fica abaixo de 80 min", 90, 85, 80],
  ])("muito longo %s", (_caso, atual, recusado, esperado) => {
    const estado = { ...inicio, duracaoMax: atual };
    const proximo = proximaRodada(estado, "muito-longo", [{ id: 1, duracaoMin: recusado }]);
    expect(proximo?.duracaoMax).toBe(esperado);
  });

  it("devolve null depois da 5ª troca", () => {
    expect(proximaRodada({ ...inicio, trocas: 4 }, "outro", mostrados)?.trocas).toBe(5);
    expect(proximaRodada({ ...inicio, trocas: 5 }, "outro", mostrados)).toBeNull();
  });
});

describe("urlsDaTroca", () => {
  const mostrados = [
    { id: 30, duracaoMin: 95 },
    { id: 40, duracaoMin: 90 },
  ];

  it("monta a URL da próxima rodada para cada motivo", () => {
    const base = "/noite?humor=cansado&exp=rir&com=a-dois";
    const resto = "vistos=10,20,30,40&trocas=3";
    expect(urlsDaTroca(completo, mostrados)).toEqual({
      "ja-vi": `${base}&tom=1&max=100&${resto}`,
      "nao-e-o-clima": `${base}&tom=2&max=100&${resto}`,
      "muito-longo": `${base}&tom=1&max=80&${resto}`,
      outro: `${base}&tom=1&max=100&${resto}`,
    });
  });

  it("devolve null quando não há mais trocas", () => {
    expect(urlsDaTroca({ ...completo, trocas: 5 }, mostrados)).toBeNull();
  });
});
