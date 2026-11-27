import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LoginForm } from "@/features/auth/components/login-form";

vi.mock("@/features/auth/actions", () => ({ entrar: vi.fn(), cadastrar: vi.fn() }));

const criarConta = () => screen.getByRole("link", { name: "Criar conta" });

describe("LoginForm", () => {
  it("leva o destino do convite para o cadastro", () => {
    render(<LoginForm next="/noite/juntos/abc" />);

    expect(criarConta()).toHaveAttribute("href", "/cadastro?next=%2Fnoite%2Fjuntos%2Fabc");
  });

  it("sem destino, o link de cadastro fica sem next", () => {
    render(<LoginForm />);

    expect(criarConta()).toHaveAttribute("href", "/cadastro");
  });
});
