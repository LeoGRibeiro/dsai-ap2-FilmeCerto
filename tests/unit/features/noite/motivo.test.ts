import { describe, expect, it } from "vitest";

import type { Clima } from "@/features/metricas/eventos";
import { TONS } from "@/features/noite/mapeamento";
import { motivoDaNoite, provedorDaNoite } from "@/features/noite/motivo";
import { terminaAs } from "@/features/noite/termina";
import type { OndeAssistir, Provedor } from "@/lib/tmdb/tipos";

const NETFLIX: Provedor = { id: 8, nome: "Netflix", logoPath: null };
const GLOBOPLAY: Provedor = { id: 307, nome: "Globoplay", logoPath: null };
const DESCONHECIDO: Provedor = { id: 9999, nome: "Cine Livre", logoPath: null };

const comediaLeve = TONS.rir.tons[0]!;
const exemplo: Clima = { humor: "cansado", experiencia: "rir", companhia: "a-dois" };

function onde(assinatura: Provedor[]): OndeAssistir {
  return { link: "https://tmdb.falso", assinatura, aluguel: [], compra: [] };
}

describe("motivoDaNoite", () => {
  it("monta a frase do exemplo do cliente", () => {
    expect(motivoDaNoite(exemplo, comediaLeve, { nota: 7.8 }, NETFLIX)).toBe(
      "Você está cansado, quer rir e vai ver a dois: comédia leve, nota 7,8, está na Netflix.",
    );
  });

  it.each([
    [
      { humor: "pra-baixo", experiencia: "emocionar", companhia: "sozinho" },
      "Você está pra baixo, quer se emocionar e vai ver sozinho",
    ],
    [
      { humor: "de-boa", experiencia: "distrair", companhia: "familia" },
      "Você está de boa, quer só se distrair e vai ver com as crianças",
    ],
    [
      { humor: "nostalgico", experiencia: "susto", companhia: "amigos" },
      "Você está nostálgico, quer levar um susto e vai ver com os amigos",
    ],
  ] as const)("o começo condiz com as respostas %o", (respostas, inicio) => {
    expect(motivoDaNoite(respostas, comediaLeve, { nota: 7 }, null)).toMatch(
      new RegExp(`^${inicio}: `),
    );
  });

  it("cita o tom da rodada e a nota com uma casa e vírgula", () => {
    const romantica = TONS.rir.tons[1]!;
    expect(motivoDaNoite(exemplo, romantica, { nota: 8 }, null)).toContain(
      ": comédia romântica, nota 8,0,",
    );
  });

  it.each([
    [GLOBOPLAY, "está no Globoplay."],
    [DESCONHECIDO, "está em Cine Livre."],
    [null, "não está nos seus streamings."],
  ])("diz onde assistir com o artigo certo (%o)", (provedor, final) => {
    expect(motivoDaNoite(exemplo, comediaLeve, { nota: 7 }, provedor)).toMatch(
      new RegExp(`${final.replace(".", "\\.")}$`),
    );
  });
});

describe("provedorDaNoite", () => {
  it("prefere um streaming da pessoa", () => {
    expect(provedorDaNoite(onde([GLOBOPLAY, NETFLIX]), [8])).toEqual(NETFLIX);
  });

  it("sem streaming da pessoa, usa a primeira assinatura", () => {
    expect(provedorDaNoite(onde([GLOBOPLAY, NETFLIX]), [119])).toEqual(GLOBOPLAY);
  });

  it("sem assinatura no Brasil, devolve null", () => {
    expect(provedorDaNoite(onde([]), [8])).toBeNull();
    expect(provedorDaNoite(null, [8])).toBeNull();
  });
});

describe("terminaAs", () => {
  it("soma a duração à hora de início", () => {
    expect(terminaAs(new Date(2026, 10, 18, 21, 48), 112)).toBe("23h40");
  });

  it("passa da meia-noite e completa os minutos com zero", () => {
    expect(terminaAs(new Date(2026, 10, 18, 22, 30), 130)).toBe("0h40");
    expect(terminaAs(new Date(2026, 10, 18, 20, 0), 65)).toBe("21h05");
  });
});
