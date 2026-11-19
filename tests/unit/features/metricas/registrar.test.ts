import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { eventoSchema, type Evento } from "@/features/metricas/eventos";
import { registrarClima, registrarEvento } from "@/features/metricas/registrar";
import type { ClienteSupabase } from "@/lib/supabase/token";

type Resposta = { error: { code: string; message: string } | null };

function clienteFalso(resposta: Resposta | Error = { error: null }) {
  const responder = vi.fn(async () => {
    if (resposta instanceof Error) throw resposta;
    return resposta;
  });
  const from = vi.fn(() => ({ insert: responder }));
  const cliente = { from, rpc: responder } as unknown as ClienteSupabase;
  return { cliente, from, responder };
}

describe("eventoSchema", () => {
  it.each<Evento>([
    { nome: "wizard_iniciado" },
    { nome: "wizard_concluido", dados: {} },
    { nome: "wizard_troca", dados: { motivo: "muito-longo" } },
    { nome: "wizard_escolheu", dados: { trocas: 5 } },
    { nome: "wizard_abandonado", dados: { etapa: "resultado" } },
    { nome: "como_foi_exibido" },
    { nome: "como_foi_respondido", dados: { resposta: "nao-vi" } },
    { nome: "trailer_aberto", dados: { origem: "noite" } },
    { nome: "trailer_aberto", dados: { origem: "serie" } },
  ])("aceita $nome", (evento) => {
    expect(eventoSchema.safeParse(evento).success).toBe(true);
  });

  it("completa os eventos sem dados com um objeto vazio", () => {
    expect(eventoSchema.parse({ nome: "wizard_iniciado" })).toEqual({
      nome: "wizard_iniciado",
      dados: {},
    });
  });

  it.each([
    ["evento desconhecido", { nome: "login" }],
    ["motivo fora da lista", { nome: "wizard_troca", dados: { motivo: "chato" } }],
    ["resposta fora da lista", { nome: "como_foi_respondido", dados: { resposta: "odiei" } }],
    ["origem fora da lista", { nome: "trailer_aberto", dados: { origem: "busca" } }],
    ["clima junto ao evento", { nome: "wizard_concluido", dados: { humor: "cansado" } }],
    ["chave extra", { nome: "trailer_aberto", dados: { origem: "filme", titulo: "X" } }],
    ["trocas acima do limite", { nome: "wizard_escolheu", dados: { trocas: 6 } }],
    ["trocas decimal", { nome: "wizard_escolheu", dados: { trocas: 1.5 } }],
  ])("recusa %s", (_caso, evento) => {
    expect(eventoSchema.safeParse(evento).success).toBe(false);
  });
});

describe("registrarEvento", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("insere nome e dados em eventos, sem usuario_id (o banco usa auth.uid())", async () => {
    const { cliente, from, responder } = clienteFalso();

    const gravou = await registrarEvento(cliente, {
      nome: "trailer_aberto",
      dados: { origem: "filme" },
    });

    expect(gravou).toBe(true);
    expect(from).toHaveBeenCalledWith("eventos");
    expect(responder).toHaveBeenCalledWith({ nome: "trailer_aberto", dados: { origem: "filme" } });
  });

  it("devolve false sem lançar quando o banco recusa", async () => {
    const { cliente } = clienteFalso({ error: { code: "42501", message: "rls" } });
    await expect(registrarEvento(cliente, { nome: "wizard_iniciado" })).resolves.toBe(false);
  });

  it("devolve false sem lançar quando a rede falha", async () => {
    const { cliente } = clienteFalso(new Error("offline"));
    await expect(registrarEvento(cliente, { nome: "wizard_iniciado" })).resolves.toBe(false);
  });

  it("não chama o banco com evento inválido", async () => {
    const { cliente, from } = clienteFalso();
    const evento = { nome: "wizard_concluido", dados: { humor: "cansado" } } as unknown as Evento;

    expect(await registrarEvento(cliente, evento)).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });
});

describe("registrarClima", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("chama registrar_clima com as três respostas", async () => {
    const { cliente, responder } = clienteFalso();

    const contou = await registrarClima(cliente, {
      humor: "pra-baixo",
      experiencia: "rir",
      companhia: "familia",
    });

    expect(contou).toBe(true);
    expect(responder).toHaveBeenCalledWith("registrar_clima", {
      p_humor: "pra-baixo",
      p_experiencia: "rir",
      p_companhia: "familia",
    });
  });

  it("devolve false sem lançar quando o banco falha", async () => {
    const { cliente } = clienteFalso({ error: { code: "23514", message: "check" } });
    await expect(
      registrarClima(cliente, { humor: "cansado", experiencia: "rir", companhia: "sozinho" }),
    ).resolves.toBe(false);
  });

  it("não chama o banco com resposta fora da lista", async () => {
    const { cliente, responder } = clienteFalso();
    const clima = { humor: "feliz", experiencia: "rir", companhia: "sozinho" } as never;

    expect(await registrarClima(cliente, clima)).toBe(false);
    expect(responder).not.toHaveBeenCalled();
  });
});
