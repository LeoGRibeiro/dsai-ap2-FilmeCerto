import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cadastrar, entrar, sair } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/server";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const ok = async () => ({ error: null });

function comAuth(auth: Record<string, unknown>) {
  vi.mocked(createClient).mockResolvedValue({ auth } as never);
}

function form(campos: Record<string, string>) {
  const dados = new FormData();
  for (const [chave, valor] of Object.entries(campos)) dados.set(chave, valor);
  return dados;
}

/** Limpou o cache do roteador e só depois redirecionou para o destino. */
function limpouERedirecionou(destino: string) {
  expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  expect(redirect).toHaveBeenCalledWith(destino);
  expect(vi.mocked(revalidatePath).mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(redirect).mock.invocationCallOrder[0]!,
  );
}

afterEach(() => vi.clearAllMocks());

describe("actions de sessão limpam o cache do roteador", () => {
  it("entrar", async () => {
    comAuth({ signInWithPassword: ok });

    await expect(
      entrar({}, form({ email: "ana@exemplo.com", senha: "segredo123", next: "/listas" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    limpouERedirecionou("/listas");
  });

  it("cadastrar", async () => {
    comAuth({ signUp: ok });

    await expect(
      cadastrar(
        {},
        form({
          nome: "Ana",
          email: "ana@exemplo.com",
          senha: "segredo123",
          confirmacao: "segredo123",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    limpouERedirecionou("/onboarding");
  });

  it("sair", async () => {
    comAuth({ signOut: ok });

    await expect(sair()).rejects.toThrow("NEXT_REDIRECT");

    limpouERedirecionou("/");
  });

  it("login com senha errada não limpa nada nem redireciona", async () => {
    comAuth({
      signInWithPassword: async () => ({ error: { code: "invalid_credentials", message: "" } }),
    });

    const estado = await entrar({}, form({ email: "ana@exemplo.com", senha: "errada123" }));

    expect(estado.mensagem).toBeTruthy();
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
