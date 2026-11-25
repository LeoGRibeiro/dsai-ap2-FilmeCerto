import { describe, expect, it } from "vitest";

import { caminhoComNext, DESTINO_PADRAO, sanitizarNext } from "@/features/auth/redirecionamento";

describe("sanitizarNext", () => {
  it.each(["/filme/1", "/dashboard?x=1", "/dashboard"])(
    "aceita o caminho interno %s",
    (caminho) => {
      expect(sanitizarNext(caminho)).toBe(caminho);
    },
  );

  it.each([
    "//evil.com",
    "https://evil.com",
    "/\\evil.com",
    "evil",
    "",
    "/\tevil.com",
    null,
    undefined,
  ])("devolve o destino padrão para %j", (valor) => {
    expect(sanitizarNext(valor)).toBe(DESTINO_PADRAO);
  });

  it("o destino padrão é /dashboard", () => {
    expect(DESTINO_PADRAO).toBe("/dashboard");
  });
});

describe("caminhoComNext", () => {
  it("leva o destino codificado em ?next=", () => {
    expect(caminhoComNext("/cadastro", "/noite/juntos/abc")).toBe(
      "/cadastro?next=%2Fnoite%2Fjuntos%2Fabc",
    );
  });

  it("preserva a query do destino", () => {
    expect(caminhoComNext("/onboarding", "/busca?q=a&b=1")).toBe(
      "/onboarding?next=%2Fbusca%3Fq%3Da%26b%3D1",
    );
  });

  it.each([DESTINO_PADRAO, undefined, ""])(
    "sem destino próprio (%j), não muda o caminho",
    (destino) => {
      expect(caminhoComNext("/cadastro", destino)).toBe("/cadastro");
    },
  );
});
