import { redirect } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";

import AppLayout from "@/app/(app)/layout";
import { exigirUsuario } from "@/features/auth/sessao";
import { obterPreferencias } from "@/features/preferencias/consultas";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/features/auth/sessao", () => ({ exigirUsuario: vi.fn() }));
vi.mock("@/features/preferencias/consultas", () => ({ obterPreferencias: vi.fn() }));

const USUARIO = { id: "u-1", email: "ana@exemplo.com", nome: "Ana" };

function renderizar() {
  return AppLayout({ children: "conteúdo" } as never);
}

afterEach(() => vi.clearAllMocks());

describe("layout da área logada", () => {
  it("pede as preferências sem esperar o usuário terminar de carregar", async () => {
    let liberarUsuario!: (usuario: typeof USUARIO) => void;
    vi.mocked(exigirUsuario).mockReturnValue(new Promise((r) => (liberarUsuario = r)));
    vi.mocked(obterPreferencias).mockResolvedValue({} as never);

    const pagina = renderizar();
    await Promise.resolve();
    expect(obterPreferencias).toHaveBeenCalled();

    liberarUsuario(USUARIO);
    expect(await pagina).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("sem preferências, manda para o onboarding", async () => {
    vi.mocked(exigirUsuario).mockResolvedValue(USUARIO);
    vi.mocked(obterPreferencias).mockResolvedValue(null);

    await expect(renderizar()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/onboarding");
  });
});
