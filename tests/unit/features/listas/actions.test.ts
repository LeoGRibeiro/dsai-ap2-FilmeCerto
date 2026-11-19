import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { alternarLista } from "@/features/listas/actions";
import { obterStatusLista } from "@/features/listas/consultas";
import { definirLista } from "@/features/listas/gravar";

import { formulario, logado } from "../../../support/actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/features/listas/consultas", () => ({ obterStatusLista: vi.fn() }));
vi.mock("@/features/listas/gravar", () => ({ definirLista: vi.fn() }));

const OK = { ok: true, titulo: "X", anterior: null, atual: "quero_assistir" } as const;

beforeEach(() => {
  logado({ id: "u-1" });
  vi.mocked(obterStatusLista).mockResolvedValue(null);
  vi.mocked(definirLista).mockResolvedValue(OK);
});
afterEach(() => vi.clearAllMocks());

describe("alternarLista", () => {
  it("com tipo serie, põe a série na lista e revalida a página dela e /listas", async () => {
    const resposta = await alternarLista(
      {},
      formulario({ tipo: "serie", tmdbId: "1399", status: "quero_assistir" }),
    );

    expect(resposta).toEqual({});
    const serie = { tipo: "serie", tmdbId: 1399 };
    expect(obterStatusLista).toHaveBeenCalledWith(serie, expect.anything());
    expect(definirLista).toHaveBeenCalledWith(expect.anything(), "u-1", serie, "quero_assistir");
    expect(revalidatePath).toHaveBeenCalledWith("/serie/1399");
    expect(revalidatePath).toHaveBeenCalledWith("/listas");
  });

  it("sem tipo, continua gravando o filme e revalidando /filme", async () => {
    vi.mocked(obterStatusLista).mockResolvedValue("assistido");

    await alternarLista({}, formulario({ tmdbId: "550", status: "assistido" }));

    expect(definirLista).toHaveBeenCalledWith(
      expect.anything(),
      "u-1",
      { tipo: "filme", tmdbId: 550 },
      null,
    );
    expect(revalidatePath).toHaveBeenCalledWith("/filme/550");
  });

  it.each([
    ["filme-nao-encontrado", "Série não encontrada."],
    ["tmdb", "Não foi possível atualizar sua lista agora. Tente de novo."],
  ] as const)("traduz o erro %s da série", async (erro, mensagem) => {
    vi.mocked(definirLista).mockResolvedValue({ ok: false, erro });

    expect(
      await alternarLista({}, formulario({ tipo: "serie", tmdbId: "1", status: "assistido" })),
    ).toEqual({ mensagem });
  });

  it("recusa tipo fora da lista e sessão expirada sem gravar", async () => {
    expect(
      await alternarLista({}, formulario({ tipo: "anime", tmdbId: "1", status: "assistido" })),
    ).toEqual({ mensagem: "Não foi possível atualizar sua lista agora. Tente de novo." });

    logado(null);
    expect(
      await alternarLista({}, formulario({ tipo: "serie", tmdbId: "1", status: "assistido" })),
    ).toEqual({ mensagem: "Sua sessão expirou. Entre de novo." });
    expect(definirLista).not.toHaveBeenCalled();
  });
});
