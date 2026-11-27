import { render, screen } from "@testing-library/react";
import { redirect } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";

import OnboardingPage from "@/app/(onboarding)/onboarding/page";
import { exigirUsuario } from "@/features/auth/sessao";
import { obterPreferencias } from "@/features/preferencias/consultas";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/features/auth/sessao", () => ({ exigirUsuario: vi.fn() }));
vi.mock("@/features/preferencias/consultas", () => ({ obterPreferencias: vi.fn() }));
vi.mock("@/features/preferencias/components/onboarding-wizard", () => ({
  OnboardingWizard: ({ next }: { next?: string }) => <p>wizard next={next ?? "nenhum"}</p>,
}));

const abrir = (next?: string) =>
  OnboardingPage({ searchParams: Promise.resolve({ next }) } as never);

afterEach(() => vi.clearAllMocks());

describe("página do onboarding", () => {
  it("passa ao wizard o destino sanitizado", async () => {
    vi.mocked(exigirUsuario).mockResolvedValue({ id: "u-1", email: "", nome: "Ana" });
    vi.mocked(obterPreferencias).mockResolvedValue(null);

    render(await abrir("/noite/juntos/abc"));
    expect(screen.getByText("wizard next=/noite/juntos/abc")).toBeInTheDocument();
  });

  it("um destino externo vira o dashboard", async () => {
    vi.mocked(exigirUsuario).mockResolvedValue({ id: "u-1", email: "", nome: "Ana" });
    vi.mocked(obterPreferencias).mockResolvedValue(null);

    render(await abrir("//evil.com"));
    expect(screen.getByText("wizard next=/dashboard")).toBeInTheDocument();
  });

  it.each([
    ["/noite/juntos/abc", "/noite/juntos/abc"],
    ["https://evil.com", "/dashboard"],
    [undefined, "/dashboard"],
  ])("com preferências e next=%s, vai para %s", async (next, destino) => {
    vi.mocked(exigirUsuario).mockResolvedValue({ id: "u-1", email: "", nome: "Ana" });
    vi.mocked(obterPreferencias).mockResolvedValue({} as never);

    await expect(abrir(next)).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(destino);
  });
});
