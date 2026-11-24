import { revalidatePath } from "next/cache";
import { afterEach, describe, expect, it, vi } from "vitest";

import { salvarFiltro } from "@/features/filtro-conteudo/actions";
import { escolhaFiltroSchema, gravarFiltro } from "@/features/filtro-conteudo/gravar";
import type { ClienteSupabase } from "@/lib/supabase/token";
import { createClient } from "@/lib/supabase/server";

import { bancoEmMemoria } from "../../../support/banco-memoria";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

afterEach(() => vi.restoreAllMocks());

describe("escolhaFiltroSchema", () => {
  it("'sem' é Sem filtro (null) e os limites passam como estão", () => {
    expect(escolhaFiltroSchema.parse("sem")).toBeNull();
    expect(["10", "14", "18"].map((v) => escolhaFiltroSchema.parse(v))).toEqual(["10", "14", "18"]);
  });

  it("recusa o que não é uma das quatro opções, com mensagem em pt-BR", () => {
    for (const valor of ["16", "L", "", null, "idade=9"]) {
      const resultado = escolhaFiltroSchema.safeParse(valor);
      expect(resultado.success, String(valor)).toBe(false);
      expect(resultado.error?.issues[0]?.message).toBe("Escolha uma das opções do filtro.");
    }
  });
});

describe("gravarFiltro", () => {
  it("um limite faz upsert só com usuario_id e limite", async () => {
    const banco = bancoEmMemoria({ filtros_conteudo: [] });
    expect(await gravarFiltro(banco.cliente, "u-1", "14")).toBe("ok");
    expect(banco.escritas).toEqual([
      expect.objectContaining({
        tabela: "filtros_conteudo",
        op: "upsert",
        valor: { usuario_id: "u-1", limite: "14" },
      }),
    ]);
  });

  it("Sem filtro apaga a linha da pessoa", async () => {
    const banco = bancoEmMemoria({ filtros_conteudo: [{ usuario_id: "u-1", limite: "10" }] });
    expect(await gravarFiltro(banco.cliente, "u-1", null)).toBe("ok");
    expect(banco.escritas).toEqual([
      expect.objectContaining({ op: "delete", filtros: [["usuario_id", "u-1"]] }),
    ]);
  });

  it("erro do banco vira 'erro', com o detalhe no log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const quebrado = {
      from: () => ({ upsert: async () => ({ error: { code: "42501", message: "rls" } }) }),
    } as unknown as ClienteSupabase;
    expect(await gravarFiltro(quebrado, "u-1", "18")).toBe("erro");
    expect(log).toHaveBeenCalledWith("[filtro-conteudo] falha ao salvar:", "42501", "rls");
  });
});

describe("salvarFiltro", () => {
  function logado(usuario: { id: string } | null) {
    const banco = bancoEmMemoria({ filtros_conteudo: [] });
    vi.mocked(createClient).mockResolvedValue({
      ...(banco.cliente as object),
      auth: { getUser: async () => ({ data: { user: usuario } }) },
    } as never);
    return banco;
  }

  const formulario = (filtro: string) => {
    const form = new FormData();
    form.set("filtro", filtro);
    return form;
  };

  it("grava a opção da pessoa logada e revalida o app inteiro", async () => {
    const banco = logado({ id: "u-1" });
    expect(await salvarFiltro({}, formulario("10"))).toEqual({ ok: true });
    expect(banco.escritas[0]).toMatchObject({ valor: { usuario_id: "u-1", limite: "10" } });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("opção inválida não chega ao banco", async () => {
    const banco = logado({ id: "u-1" });
    expect(await salvarFiltro({}, formulario("16"))).toEqual({
      mensagem: "Escolha uma das opções do filtro.",
    });
    expect(banco.escritas).toEqual([]);
  });

  it("sem sessão, pede para entrar de novo", async () => {
    logado(null);
    expect(await salvarFiltro({}, formulario("sem"))).toEqual({
      mensagem: "Sua sessão expirou. Entre de novo.",
    });
  });
});
