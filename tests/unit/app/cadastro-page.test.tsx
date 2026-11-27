import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CadastroPage from "@/app/(auth)/cadastro/page";

vi.mock("@/features/auth/actions", () => ({ cadastrar: vi.fn(), entrar: vi.fn() }));

async function renderizar(next?: string | string[]) {
  const pagina = await CadastroPage({ searchParams: Promise.resolve({ next }) } as never);
  const { container } = render(pagina);
  return {
    next: container.querySelector<HTMLInputElement>('input[name="next"]')?.value,
    entrar: screen.getByRole("link", { name: "Entrar" }).getAttribute("href"),
  };
}

describe("página de cadastro", () => {
  it("passa o destino do convite ao formulário", async () => {
    expect(await renderizar("/noite/juntos/abc")).toEqual({
      next: "/noite/juntos/abc",
      entrar: "/login?next=%2Fnoite%2Fjuntos%2Fabc",
    });
  });

  it.each(["//evil.com", "https://evil.com"])(
    "troca o destino externo %s pelo padrão",
    async (next) => {
      const { next: enviado, entrar } = await renderizar(next);
      expect(enviado).toBe("/dashboard");
      expect(entrar).toBe("/login");
    },
  );

  it("sem next, o formulário fica como antes", async () => {
    expect(await renderizar()).toEqual({ next: undefined, entrar: "/login" });
  });
});
