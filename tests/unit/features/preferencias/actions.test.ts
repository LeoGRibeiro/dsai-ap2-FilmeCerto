import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";

import { salvarPreferencias } from "@/features/preferencias/actions";
import { gravarOnboarding } from "@/features/preferencias/gravar";
import { createClient } from "@/lib/supabase/server";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/features/preferencias/gravar", () => ({ gravarOnboarding: vi.fn() }));
vi.mock("@/lib/tmdb/filmes", () => ({ obterFilme: vi.fn() }));

function formulario(next?: string) {
  const form = new FormData();
  if (next !== undefined) form.set("next", next);
  form.append("generos", "28");
  form.append("generos", "18");
  form.set("duracao", "media");
  form.set("frequencia", "semanal");
  return form;
}

afterEach(() => vi.clearAllMocks());

describe("salvarPreferencias", () => {
  it("limpa o cache do roteador antes de mandar para o dashboard", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u-1" } } }) },
    } as never);
    vi.mocked(gravarOnboarding).mockResolvedValue("ok" as never);

    await expect(salvarPreferencias({}, formulario())).rejects.toThrow("NEXT_REDIRECT");

    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(redirect).toHaveBeenCalledWith("/dashboard");
    expect(vi.mocked(revalidatePath).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(redirect).mock.invocationCallOrder[0]!,
    );
  });

  it("se não conseguiu gravar, não limpa o cache nem redireciona", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u-1" } } }) },
    } as never);
    vi.mocked(gravarOnboarding).mockResolvedValue("erro" as never);

    expect(await salvarPreferencias({}, formulario())).toEqual({
      mensagem: "Não foi possível salvar agora. Tente de novo.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("salvarPreferencias com o destino do convite", () => {
  function comUsuario(user: { id: string } | null = { id: "u-1" }) {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user } }) },
    } as never);
    vi.mocked(gravarOnboarding).mockResolvedValue("ok" as never);
  }

  it("limpa o cache do roteador e só depois volta para a sala", async () => {
    comUsuario();

    await expect(salvarPreferencias({}, formulario("/noite/juntos/abc"))).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(redirect).toHaveBeenCalledWith("/noite/juntos/abc");
    expect(vi.mocked(revalidatePath).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(redirect).mock.invocationCallOrder[0]!,
    );
  });

  it.each(["//evil.com", "https://evil.com"])(
    "troca o destino externo %s pelo dashboard",
    async (next) => {
      comUsuario();

      await expect(salvarPreferencias({}, formulario(next))).rejects.toThrow("NEXT_REDIRECT");

      expect(redirect).toHaveBeenCalledWith("/dashboard");
    },
  );

  it("sem sessão, o login guarda o onboarding com o destino", async () => {
    comUsuario(null);

    await expect(salvarPreferencias({}, formulario("/noite/juntos/abc"))).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(redirect).toHaveBeenCalledWith(
      `/login?next=${encodeURIComponent("/onboarding?next=%2Fnoite%2Fjuntos%2Fabc")}`,
    );
    expect(gravarOnboarding).not.toHaveBeenCalled();
  });
});
