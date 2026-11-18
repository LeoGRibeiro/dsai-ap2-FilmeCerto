import { describe, expect, it } from "vitest";

import {
  ESTADO_INICIAL,
  lerEstado,
  proximaPergunta,
  proximaRodada,
  respostasCompletas,
  urlComResposta,
  urlDaNoite,
  type EstadoNoite,
} from "@/features/noite/estado";

const completo: EstadoNoite = {
  respostas: { humor: "cansado", experiencia: "rir", companhia: "a-dois" },
  tom: 1,
  duracaoMax: 100,
  vistos: [10, 20],
  trocas: 2,
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
