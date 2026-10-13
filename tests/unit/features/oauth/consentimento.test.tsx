import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/oauth/actions", () => ({ decidirAutorizacao: vi.fn() }));

import { Consentimento } from "@/features/oauth/components/consentimento";

describe("Consentimento", () => {
  it("mostra cliente, host de retorno, permissões e os dois botões", () => {
    render(
      <Consentimento
        authorizationId="auth-1"
        cliente="Claude Code"
        redirectUri="http://localhost:53682/callback"
        escopos={["openid", "email"]}
        email="ana@filmecerto.test"
      />,
    );
    expect(screen.getByRole("heading", { name: /Claude Code quer acessar sua conta/ })).toBeInTheDocument();
    expect(screen.getByText("localhost:53682")).toBeInTheDocument();
    expect(screen.getByText(/ana@filmecerto.test/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Autorizar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Negar" })).toBeInTheDocument();
  });
});
