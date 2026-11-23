import { describe, expect, it, vi } from "vitest";

import { obterFiltro } from "@/features/filtro-conteudo/consultas";
import type { ClienteSupabase } from "@/lib/supabase/token";

import { bancoEmMemoria } from "../../../support/banco-memoria";

/** Cliente cuja leitura devolve exatamente `resposta`, para os casos que o banco real recusaria. */
function clienteQueResponde(resposta: { data: unknown; error: unknown }) {
  return {
    from: () => ({ select: () => ({ maybeSingle: async () => resposta }) }),
  } as unknown as ClienteSupabase;
}

describe("obterFiltro", () => {
  it("sem linha, o filtro está desligado", async () => {
    const { cliente } = bancoEmMemoria({ filtros_conteudo: [] });
    expect(await obterFiltro(cliente)).toBeNull();
  });

  it("devolve o limite e o modo gravados", async () => {
    const { cliente } = bancoEmMemoria({
      filtros_conteudo: [{ classificacao_max: "14", modo: "ocultar" }],
    });
    expect(await obterFiltro(cliente)).toEqual({ limite: "14", modo: "ocultar" });
  });

  it("erro do banco vira uma mensagem em pt-BR, com o detalhe só no log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const cliente = clienteQueResponde({ data: null, error: { code: "500", message: "caiu" } });
    await expect(obterFiltro(cliente)).rejects.toThrow("Não foi possível carregar o filtro");
    expect(log).toHaveBeenCalledWith("[filtro-conteudo] falha ao ler:", "500", "caiu");
    log.mockRestore();
  });

  it("um limite fora da lista não vira filtro desligado em silêncio", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const cliente = clienteQueResponde({
      data: { classificacao_max: "18", modo: "ocultar" },
      error: null,
    });
    await expect(obterFiltro(cliente)).rejects.toThrow();
  });
});
