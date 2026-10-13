import { describe, expect, it, vi } from "vitest";

import { avaliarFilme } from "@/features/mcp/tools/avaliar-filme";
import { marcarNaLista } from "@/features/mcp/tools/marcar-na-lista";

import { contexto, dadosFalsos } from "./fakes";

const json = (r: { content: { text: string }[] }) => JSON.parse(r.content[0].text);

describe("marcar_na_lista", () => {
  it("valida a entrada e é idempotente, sem ser readOnly", () => {
    expect(marcarNaLista.entrada.safeParse({ tmdb_id: 1, lista: "favoritos" }).success).toBe(false);
    expect(marcarNaLista.entrada.safeParse({ tmdb_id: 1, lista: "nenhuma" }).success).toBe(true);
    expect(marcarNaLista.anotacoes).toMatchObject({ readOnlyHint: false, idempotentHint: true });
  });
  it("'nenhuma' vira null e a saída traz o antes e o depois", async () => {
    const definirLista = vi.fn(async () => ({ ok: true as const, titulo: "Duna", anterior: "quero_assistir" as const, atual: null }));
    const ctx = contexto({ dados: dadosFalsos({ definirLista }) });
    const r = json(await marcarNaLista.executar({ tmdb_id: 5, lista: "nenhuma" }, ctx));
    expect(definirLista).toHaveBeenCalledWith(5, null);
    expect(r).toEqual({ tmdb_id: 5, titulo: "Duna", lista: "nenhuma", lista_anterior: "quero_assistir" });
  });
  it("erros tipados viram mensagens", async () => {
    for (const [erroTipo, texto] of [["filme-nao-encontrado", "Filme não encontrado."], ["tmdb", "TMDB"], ["banco", "sua conta"]] as const) {
      const ctx = contexto({ dados: dadosFalsos({ definirLista: vi.fn(async () => ({ ok: false as const, erro: erroTipo })) }) });
      const r = await marcarNaLista.executar({ tmdb_id: 5, lista: "assistido" }, ctx);
      expect(r.isError).toBe(true);
      expect(r.content[0].text).toContain(texto);
    }
  });
});

describe("avaliar_filme", () => {
  it("passa a reação e devolve o antes e o depois", async () => {
    const definirReacao = vi.fn(async () => ({ ok: true as const, titulo: "Duna", anterior: null, atual: "amei" as const }));
    const ctx = contexto({ dados: dadosFalsos({ definirReacao }) });
    const r = json(await avaliarFilme.executar({ tmdb_id: 5, reacao: "amei" }, ctx));
    expect(definirReacao).toHaveBeenCalledWith(5, "amei");
    expect(r).toEqual({ tmdb_id: 5, titulo: "Duna", reacao: "amei", reacao_anterior: "nenhuma" });
  });
  it("rejeita reação fora do enum", () => {
    expect(avaliarFilme.entrada.safeParse({ tmdb_id: 5, reacao: "odiei" }).success).toBe(false);
  });
});
