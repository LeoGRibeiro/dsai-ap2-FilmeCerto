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

function formulario() {
  const form = new FormData();
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
