import { redirect } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";

import { criarSala, montarSala, responderSala } from "@/features/noite/actions-sala";
import { createClient } from "@/lib/supabase/server";

import { bancoFalso, RIR, SALA } from "./banco-sala";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

describe("ações da sala", () => {
  afterEach(() => vi.clearAllMocks());

  it("criarSala cria a sala e leva a ela", async () => {
    const { cliente } = bancoFalso({ criar_sala_noite: { data: SALA } });
    vi.mocked(createClient).mockResolvedValue(cliente);

    await expect(criarSala()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(`/noite/juntos/${SALA}`);
  });

  it("responderSala recusa respostas inválidas sem ir ao banco", async () => {
    const { cliente, rpc } = bancoFalso({});
    vi.mocked(createClient).mockResolvedValue(cliente);

    expect(await responderSala(SALA, { ...RIR, humor: "furioso" })).toEqual({
      mensagem: "Respostas inválidas. Responda de novo.",
    });
    expect(await responderSala("nao-e-uuid", RIR)).toHaveProperty("mensagem");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("responderSala grava as respostas e volta para a sala; sala encerrada vira mensagem", async () => {
    const { cliente, rpc } = bancoFalso({});
    vi.mocked(createClient).mockResolvedValue(cliente);
    await expect(responderSala(SALA, RIR)).rejects.toThrow("NEXT_REDIRECT");
    expect(rpc).toHaveBeenCalledWith("responder_sala_noite", {
      p_sala: SALA,
      p_humor: "animado",
      p_experiencia: "rir",
      p_companhia: "a-dois",
    });

    vi.spyOn(console, "error").mockImplementation(() => {});
    const encerrada = bancoFalso({
      responder_sala_noite: { error: { code: "P0001", message: "sala encerrada" } },
    });
    vi.mocked(createClient).mockResolvedValue(encerrada.cliente);
    expect(await responderSala(SALA, RIR)).toEqual({ mensagem: "Essa sala já foi encerrada." });
  });

  it("montarSala recusa ID inválido", async () => {
    expect(await montarSala("x")).toEqual({ ok: false, mensagem: "Sala não encontrada." });
  });
});
