import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { redirect, useRouter } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import NoitePage from "@/app/(app)/noite/page";
import { BotaoVoltar } from "@/features/noite/components/botao-voltar";
import { obterPreferencias } from "@/features/preferencias/consultas";
import type { PreferenciasInput } from "@/features/preferencias/schema";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((destino: string) => {
    throw new Error(`NEXT_REDIRECT ${destino}`);
  }),
  useRouter: vi.fn(),
}));
vi.mock("@/features/auth/sessao", () => ({
  exigirUsuario: vi.fn(async () => ({ id: "u-1", email: "a@b.c", nome: "Ana" })),
}));
vi.mock("@/features/preferencias/consultas", () => ({ obterPreferencias: vi.fn() }));

const preferencias: PreferenciasInput = {
  generos: [28],
  generosEvitados: [],
  duracao: "media",
  frequencia: "semanal",
  streamings: [],
};

const router = { back: vi.fn(), push: vi.fn() };

beforeEach(() => {
  vi.mocked(obterPreferencias).mockResolvedValue(preferencias);
  vi.mocked(useRouter).mockReturnValue(router as never);
});
afterEach(() => vi.clearAllMocks());

async function abrir(busca: Record<string, string>) {
  render(await NoitePage({ searchParams: Promise.resolve(busca) } as PageProps<"/noite">));
}

/** Rótulo e destino de cada cartão de resposta. */
function cartoes() {
  return within(screen.getByRole("list"))
    .getAllByRole("link")
    .map((link) => [link.textContent, link.getAttribute("href")]);
}

describe("página /noite: perguntas", () => {
  it("sem respostas, pergunta o humor com um cartão por resposta", async () => {
    await abrir({});

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Como você está se sentindo?",
    );
    expect(screen.getByText("1 de 3")).toBeInTheDocument();
    expect(cartoes()).toEqual([
      ["Cansado", "/noite?humor=cansado"],
      ["Animado", "/noite?humor=animado"],
      ["Pra baixo", "/noite?humor=pra-baixo"],
      ["Nostálgico", "/noite?humor=nostalgico"],
      ["Ansioso", "/noite?humor=ansioso"],
      ["De boa", "/noite?humor=de-boa"],
    ]);
    expect(screen.getByRole("button", { name: "Voltar" })).toBeInTheDocument();
  });

  it("com o humor, pergunta a experiência mantendo a resposta na URL", async () => {
    await abrir({ humor: "cansado" });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Que tipo de experiência você quer?",
    );
    expect(screen.getByText("2 de 3")).toBeInTheDocument();
    expect(cartoes()).toContainEqual(["Rir", "/noite?humor=cansado&exp=rir"]);
    expect(cartoes()).toHaveLength(6);
  });

  it("com humor e experiência, pergunta a companhia", async () => {
    await abrir({ humor: "cansado", exp: "rir" });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Com quem vai assistir?");
    expect(screen.getByText("3 de 3")).toBeInTheDocument();
    expect(cartoes()).toEqual([
      ["Sozinho", "/noite?humor=cansado&exp=rir&com=sozinho"],
      ["A dois", "/noite?humor=cansado&exp=rir&com=a-dois"],
      ["Família com crianças", "/noite?humor=cansado&exp=rir&com=familia"],
      ["Amigos", "/noite?humor=cansado&exp=rir&com=amigos"],
    ]);
  });

  it("ignora resposta inválida na URL e pergunta de novo o que falta", async () => {
    await abrir({ humor: "furioso", exp: "rir" });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Como você está se sentindo?",
    );
    expect(cartoes()).toContainEqual(["Cansado", "/noite?humor=cansado&exp=rir"]);
  });

  it("sem preferências, manda para o onboarding", async () => {
    vi.mocked(obterPreferencias).mockResolvedValue(null);

    await expect(abrir({})).rejects.toThrow("NEXT_REDIRECT /onboarding");
    expect(redirect).toHaveBeenCalledWith("/onboarding");
  });
});

describe("BotaoVoltar", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("volta uma entrada no histórico", async () => {
    vi.stubGlobal("history", { length: 3 });
    render(<BotaoVoltar />);

    await userEvent.click(screen.getByRole("button", { name: "Voltar" }));

    expect(router.back).toHaveBeenCalledOnce();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("sem histórico, vai para o dashboard", async () => {
    vi.stubGlobal("history", { length: 1 });
    render(<BotaoVoltar />);

    await userEvent.click(screen.getByRole("button", { name: "Voltar" }));

    expect(router.push).toHaveBeenCalledExactlyOnceWith("/dashboard");
    expect(router.back).not.toHaveBeenCalled();
  });
});
