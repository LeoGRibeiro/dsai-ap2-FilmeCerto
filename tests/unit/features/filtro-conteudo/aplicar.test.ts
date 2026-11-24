import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CONSULTAS_SIMULTANEAS,
  descobrirAte,
  semBloqueados,
  soRecomendaveis,
  type Classificar,
} from "@/features/filtro-conteudo/aplicar";
import type { FiltroConteudo } from "@/features/filtro-conteudo/opcoes";
import type { Midia } from "@/lib/midia";
import type { ClassificacaoBR } from "@/lib/tmdb/tipos";

type Item = { id: number };
const itens = (...ids: number[]): Item[] => ids.map((id) => ({ id }));
const comoFilme = (item: Item): Midia => ({ tipo: "filme", tmdbId: item.id });

/** Classificador falso a partir de um mapa id → classificação; ID fora do mapa lança. */
function classificador(mapa: Record<number, ClassificacaoBR | null>) {
  return vi.fn<Classificar>(async ({ tmdbId }) => {
    if (!(tmdbId in mapa)) throw new Error("TMDB fora do ar");
    return mapa[tmdbId]!;
  });
}

afterEach(() => vi.restoreAllMocks());

describe("semBloqueados", () => {
  it("sem filtro, devolve a mesma lista sem consultar nada", async () => {
    const classificar = classificador({});
    expect(await semBloqueados(itens(1, 2), null, comoFilme, classificar)).toEqual(itens(1, 2));
    expect(classificar).not.toHaveBeenCalled();
  });

  it("com filtro, tira o 18 e mantém o resto, inclusive sem classificação, na ordem", async () => {
    const classificar = classificador({ 1: "16", 2: "18", 3: null, 4: "L" });
    const lista = await semBloqueados(itens(1, 2, 3, 4), "10", comoFilme, classificar);
    expect(lista).toEqual(itens(1, 3, 4));
    expect(classificar).toHaveBeenCalledWith({ tipo: "filme", tmdbId: 2 });
  });

  it("uma consulta que falha tira o título e vai para o log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const classificar = classificador({ 1: "12" });
    expect(await semBloqueados(itens(1, 99), "18", comoFilme, classificar)).toEqual(itens(1));
    expect(log).toHaveBeenCalledWith(expect.stringContaining("1 classificações falharam"));
  });

  it(`nunca faz mais de ${CONSULTAS_SIMULTANEAS} consultas ao mesmo tempo`, async () => {
    let abertas = 0;
    let pico = 0;
    const classificar: Classificar = async () => {
      abertas++;
      pico = Math.max(pico, abertas);
      await new Promise((resolver) => setTimeout(resolver, 1));
      abertas--;
      return "12";
    };
    const ids = Array.from({ length: 30 }, (_, i) => i + 1);
    const lista = await semBloqueados(itens(...ids), "14", comoFilme, classificar);
    expect(lista).toHaveLength(30);
    expect(pico).toBe(CONSULTAS_SIMULTANEAS);
  });
});

describe("soRecomendaveis", () => {
  const classificar = () => classificador({ 1: "L", 2: "12", 3: "14", 4: "16", 5: "18", 6: null });

  it("sem filtro, devolve a mesma lista sem consultar nada", async () => {
    const espiao = classificar();
    expect(await soRecomendaveis(itens(1, 5), null, comoFilme, espiao)).toEqual(itens(1, 5));
    expect(espiao).not.toHaveBeenCalled();
  });

  it.each<[FiltroConteudo, number[]]>([
    ["10", [1, 6]],
    ["14", [1, 2, 3, 6]],
    ["18", [1, 2, 3, 4, 6]],
  ])("com o filtro %s, tira o que passa do limite e mantém o sem classificação", async (f, ids) => {
    const lista = await soRecomendaveis(itens(1, 2, 3, 4, 5, 6), f, comoFilme, classificar());
    expect(lista).toEqual(itens(...ids));
  });

  it("uma consulta que falha tira o título", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await soRecomendaveis(itens(1, 99), "14", comoFilme, classificar())).toEqual(itens(1));
  });
});

describe("descobrirAte", () => {
  type Filtros = { generos?: number[]; classificacaoMax?: ClassificacaoBR };
  const descobrir = () => vi.fn(async (filtros?: Filtros) => filtros);

  it("sem limite, devolve a mesma função", () => {
    const original = descobrir();
    expect(descobrirAte(original, null)).toBe(original);
  });

  it("com limite, toda consulta vai até ele, mantendo os outros filtros", async () => {
    const original = descobrir();
    expect(await descobrirAte(original, "10")({ generos: [35] })).toEqual({
      generos: [35],
      classificacaoMax: "10",
    });
    expect(await descobrirAte(original, "16")()).toEqual({ classificacaoMax: "16" });
  });

  it("um limite menor que já vem nos filtros (a família, 12) continua valendo", async () => {
    const original = descobrir();
    expect(await descobrirAte(original, "14")({ classificacaoMax: "12" })).toEqual({
      classificacaoMax: "12",
    });
    expect(await descobrirAte(original, "14")({ classificacaoMax: "18" })).toEqual({
      classificacaoMax: "14",
    });
  });
});
