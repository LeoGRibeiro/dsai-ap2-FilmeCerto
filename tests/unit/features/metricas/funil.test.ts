import { describe, expect, it } from "vitest";

import type { TotalDetalhe, TotalEvento } from "@/features/metricas/consultas";
import {
  calcularFunil,
  distribuir,
  larguraBarra,
  lerRecorte,
  porcentagem,
} from "@/features/metricas/funil";
import { ROTULOS_MOTIVO, ROTULOS_TROCAS } from "@/features/metricas/rotulos";

const FUNIL = ["wizard_iniciado", "wizard_concluido", "wizard_escolheu"] as const;
const MOTIVOS = Object.keys(ROTULOS_MOTIVO);

function evento(nome: string, total: number, semEquipe = total): TotalEvento {
  return { nome, total, pessoas: 1, semEquipe };
}

function detalhe(
  nome: string,
  chave: string,
  valor: string,
  total: number,
  semEquipe = total,
): TotalDetalhe {
  return { nome, chave, valor, total, semEquipe };
}

describe("lerRecorte", () => {
  it("reconhece o recorte sem a equipe", () => {
    expect(lerRecorte("sem-equipe")).toBe("sem-equipe");
  });

  it.each([undefined, "", "todos", "equipe", ["sem-equipe", "todos"]])(
    "%j conta todos",
    (valor) => {
      expect(lerRecorte(valor)).toBe("todos");
    },
  );
});

describe("porcentagem e larguraBarra", () => {
  it.each([
    [1, 3, 33],
    [2, 3, 67],
    [5, 5, 100],
    [0, 4, 0],
    [6, 5, 120],
    [0, 0, null],
    [3, 0, null],
  ])("%i de %i é %j", (parte, todo, esperado) => {
    expect(porcentagem(parte, todo)).toBe(esperado);
  });

  it.each([
    [null, 0],
    [0, 0],
    [45, 45],
    [100, 100],
    [120, 100],
  ])("a barra de %j tem largura %i", (pct, largura) => {
    expect(larguraBarra(pct)).toBe(largura);
  });
});

describe("calcularFunil", () => {
  it("sem nenhum evento, devolve as etapas com zero e sem porcentagem", () => {
    expect(calcularFunil([], FUNIL, "todos")).toEqual([
      { nome: "wizard_iniciado", total: 0, doInicio: null, daAnterior: null },
      { nome: "wizard_concluido", total: 0, doInicio: null, daAnterior: null },
      { nome: "wizard_escolheu", total: 0, doInicio: null, daAnterior: null },
    ]);
  });

  it("devolve as etapas na ordem, com a % do início e da etapa anterior", () => {
    const eventos = [
      evento("wizard_escolheu", 3),
      evento("trailer_aberto", 50),
      evento("wizard_iniciado", 10),
      evento("wizard_concluido", 8),
    ];
    expect(calcularFunil(eventos, FUNIL, "todos")).toEqual([
      { nome: "wizard_iniciado", total: 10, doInicio: 100, daAnterior: null },
      { nome: "wizard_concluido", total: 8, doInicio: 80, daAnterior: 80 },
      { nome: "wizard_escolheu", total: 3, doInicio: 30, daAnterior: 38 },
    ]);
  });

  it("no recorte sem a equipe, usa só as contas de fora da equipe", () => {
    const eventos = [evento("wizard_iniciado", 10, 4), evento("wizard_concluido", 8, 1)];
    const funil = calcularFunil(eventos, FUNIL, "sem-equipe");
    expect(funil.map((etapa) => etapa.total)).toEqual([4, 1, 0]);
    expect(funil[1]).toMatchObject({ doInicio: 25, daAnterior: 25 });
    expect(funil[2]).toMatchObject({ doInicio: 0, daAnterior: 0 });
  });

  it("mostra a porcentagem real quando uma etapa passa da anterior", () => {
    const eventos = [evento("como_foi_exibido", 5), evento("como_foi_respondido", 6)];
    const [, respondido] = calcularFunil(
      eventos,
      ["como_foi_exibido", "como_foi_respondido"],
      "todos",
    );
    expect(respondido.daAnterior).toBe(120);
    expect(larguraBarra(respondido.doInicio)).toBe(100);
  });

  it("sem início, as etapas seguintes ficam sem a % do início", () => {
    const funil = calcularFunil([evento("wizard_concluido", 2)], FUNIL, "todos");
    expect(funil[1]).toEqual({
      nome: "wizard_concluido",
      total: 2,
      doInicio: null,
      daAnterior: null,
    });
    expect(funil[2]).toMatchObject({ total: 0, daAnterior: 0 });
  });
});

describe("distribuir", () => {
  it("devolve todos os valores na ordem da lista, com zero nos ausentes e a % da soma", () => {
    const detalhes = [
      detalhe("wizard_troca", "motivo", "muito-longo", 1),
      detalhe("wizard_troca", "motivo", "ja-vi", 3),
    ];
    expect(distribuir(detalhes, "wizard_troca", "motivo", MOTIVOS, "todos")).toEqual([
      { valor: "ja-vi", total: 3, parcela: 75 },
      { valor: "nao-e-o-clima", total: 0, parcela: 0 },
      { valor: "muito-longo", total: 1, parcela: 25 },
      { valor: "outro", total: 0, parcela: 0 },
    ]);
  });

  it("sem eventos, devolve todos os valores com zero e sem porcentagem", () => {
    const fatias = distribuir([], "wizard_troca", "motivo", MOTIVOS, "todos");
    expect(fatias.map((fatia) => [fatia.total, fatia.parcela])).toEqual([
      [0, null],
      [0, null],
      [0, null],
      [0, null],
    ]);
  });

  it("ignora valores fora da lista, outras chaves e outros eventos", () => {
    const detalhes = [
      detalhe("wizard_troca", "motivo", "outro", 2),
      detalhe("wizard_troca", "motivo", "<script>", 40),
      detalhe("wizard_troca", "extra", "ja-vi", 40),
      detalhe("trailer_aberto", "motivo", "ja-vi", 40),
    ];
    const fatias = distribuir(detalhes, "wizard_troca", "motivo", MOTIVOS, "todos");
    expect(fatias.map((fatia) => fatia.total)).toEqual([0, 0, 0, 2]);
    expect(fatias[3].parcela).toBe(100);
  });

  it("conta as trocas até escolher pelos valores gravados, no recorte sem a equipe", () => {
    const detalhes = [
      detalhe("wizard_escolheu", "trocas", "0", 6, 2),
      detalhe("wizard_escolheu", "trocas", "5", 4, 2),
    ];
    const fatias = distribuir(
      detalhes,
      "wizard_escolheu",
      "trocas",
      Object.keys(ROTULOS_TROCAS),
      "sem-equipe",
    );
    expect(fatias.map((fatia) => fatia.valor)).toEqual(["0", "1", "2", "3", "4", "5"]);
    expect(fatias.map((fatia) => fatia.total)).toEqual([2, 0, 0, 0, 0, 2]);
    expect(fatias[0].parcela).toBe(50);
    expect(ROTULOS_TROCAS["0"]).toBe("De primeira");
    expect(ROTULOS_TROCAS["1"]).toBe("Depois de 1 troca");
    expect(ROTULOS_TROCAS["5"]).toBe("Depois de 5 trocas");
  });
});
