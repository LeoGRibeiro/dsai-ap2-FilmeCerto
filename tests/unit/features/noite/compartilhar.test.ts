import { describe, expect, it } from "vitest";

import { linkWhatsApp, mensagemDaNoite, urlDoFilme } from "@/features/noite/compartilhar";

const hora = (h: number, m: number) => new Date(2026, 10, 18, h, m);

describe("mensagemDaNoite", () => {
  it("diz o filme e a hora em que termina, começando agora", () => {
    expect(mensagemDaNoite("Amor à Primeira Risada", 115, hora(21, 45))).toBe(
      "Hoje vamos ver Amor à Primeira Risada, termina às 23h40",
    );
  });

  it("atravessa a meia-noite", () => {
    expect(mensagemDaNoite("Filme 35020", 125, hora(23, 30))).toBe(
      "Hoje vamos ver Filme 35020, termina às 1h35",
    );
  });

  it("de uma série, diz que é um episódio e a hora em que ele termina", () => {
    expect(mensagemDaNoite("Dark", 50, hora(23, 30), "serie")).toBe(
      "Hoje vamos ver um episódio de Dark, termina às 0h20",
    );
  });

  it("sem duração conhecida, não inventa a hora", () => {
    expect(mensagemDaNoite("Sem Duração", null, hora(21, 45))).toBe("Hoje vamos ver Sem Duração");
  });
});

describe("urlDoFilme", () => {
  it("junta a origem do app e a página pública do filme", () => {
    expect(urlDoFilme("https://filme-certo.example", 603)).toBe(
      "https://filme-certo.example/compartilhado/filme/603",
    );
  });

  it("de uma série, leva à página pública da série", () => {
    expect(urlDoFilme("https://filme-certo.example", 603, "serie")).toBe(
      "https://filme-certo.example/compartilhado/serie/603",
    );
  });
});

describe("linkWhatsApp", () => {
  const url = "https://filme-certo.example/filme/7";

  it("manda a mensagem e, na linha de baixo, o link do filme", () => {
    const link = linkWhatsApp("Hoje vamos ver Duna, termina às 23h40", url);

    expect(link.startsWith("https://wa.me/?text=")).toBe(true);
    const texto = new URL(link).searchParams.get("text");
    expect(texto).toBe(`Hoje vamos ver Duna, termina às 23h40\n${url}`);
  });

  it("codifica acentos, '&', '#' e '?' do título, sem cortar a mensagem", () => {
    const mensagem = "Hoje vamos ver Velozes & Furiosos #7: é agora?, termina às 0h05";
    const link = linkWhatsApp(mensagem, url);
    const texto = link.slice("https://wa.me/?text=".length);

    expect(texto).toContain("Velozes%20%26%20Furiosos%20%237%3A%20%C3%A9%20agora%3F");
    expect(texto).not.toMatch(/[&#?\s]/);
    expect(new URL(link).searchParams.get("text")).toBe(`${mensagem}\n${url}`);
  });
});
