import { describe, expect, it } from "vitest";

import { generosEmTv } from "@/features/serie/generos";

describe("generosEmTv (tabela da spec series-descoberta)", () => {
  it.each([
    [28, 10759],
    [12, 10759],
    [878, 10765],
    [14, 10765],
    [10752, 10768],
  ])("o gênero de filme %i vira o gênero de TV %i", (filme, tv) => {
    expect(generosEmTv([filme])).toEqual([tv]);
  });

  it("os gêneros com o mesmo ID em TV continuam iguais", () => {
    const iguais = [16, 35, 80, 99, 18, 10751, 37, 9648];
    expect(generosEmTv(iguais)).toEqual(iguais);
  });

  it("os gêneros sem equivalente em TV somem", () => {
    expect(generosEmTv([27, 53, 10749, 36, 10402, 10770])).toEqual([]);
  });

  it("não repete o gênero de TV quando dois de filme viram o mesmo", () => {
    expect(generosEmTv([28, 12, 27, 35])).toEqual([10759, 35]);
  });
});
