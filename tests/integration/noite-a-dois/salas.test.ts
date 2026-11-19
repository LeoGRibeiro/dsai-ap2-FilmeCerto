import { beforeAll, describe, expect, it } from "vitest";

import { criarUsuario } from "../../support/supabase-local";

type Usuario = Awaited<ReturnType<typeof criarUsuario>>;

const RIR = { p_humor: "cansado", p_experiencia: "rir", p_companhia: "a-dois" };
const TENSO = { p_humor: "animado", p_experiencia: "tenso", p_companhia: "familia" };
const RESULTADO = { filmes: [{ id: 35020, motivo: "Um quer rir e o outro quer ficar tenso." }] };

async function criarSala(usuario: Usuario, segundos?: number) {
  const { data, error } = await usuario.cliente.rpc(
    "criar_sala_noite",
    segundos ? { p_segundos: segundos } : {},
  );
  if (error || !data) throw error ?? new Error("criar_sala_noite não devolveu o ID");
  return data;
}

async function entrar(usuario: Usuario, sala: string) {
  const { data, error } = await usuario.cliente.rpc("entrar_sala_noite", { p_sala: sala });
  if (error) throw error;
  return data;
}

async function ler(usuario: Usuario, sala: string) {
  const { data, error } = await usuario.cliente
    .from("salas_noite")
    .select("criador_id, convidado_id, respostas_criador, respostas_convidado, resultado")
    .eq("id", sala);
  if (error) throw error;
  return data;
}

describe("RLS e funções das salas da 'Noite a dois'", () => {
  let a: Usuario;
  let b: Usuario;
  let c: Usuario;
  let sala: string;

  beforeAll(async () => {
    [a, b, c] = await Promise.all([
      criarUsuario("Criadora A"),
      criarUsuario("Convidado B"),
      criarUsuario("Terceira C"),
    ]);
    sala = await criarSala(a);
  });

  it("a criadora lê a sala; quem ainda não entrou não lê", async () => {
    expect(await ler(a, sala)).toEqual([
      expect.objectContaining({ criador_id: a.id, convidado_id: null, resultado: null }),
    ]);
    expect(await ler(b, sala)).toEqual([]);
  });

  it("a primeira pessoa com o link entra; a terceira encontra a sala cheia e não lê", async () => {
    expect(await entrar(a, sala)).toBe("criador");
    expect(await entrar(b, sala)).toBe("convidado");
    expect(await entrar(b, sala)).toBe("convidado");
    expect(await entrar(c, sala)).toBe("cheia");

    expect(await ler(b, sala)).toEqual([expect.objectContaining({ convidado_id: b.id })]);
    expect(await ler(c, sala)).toEqual([]);
    expect(await entrar(c, crypto.randomUUID())).toBe("inexistente");
  });

  it("cada um grava só a própria resposta; quem não está na sala não grava", async () => {
    expect((await a.cliente.rpc("responder_sala_noite", { p_sala: sala, ...RIR })).error).toBe(
      null,
    );
    const deC = await c.cliente.rpc("responder_sala_noite", { p_sala: sala, ...TENSO });
    expect(deC.error?.code).toBe("42501");

    const invalida = await b.cliente.rpc("responder_sala_noite", {
      p_sala: sala,
      ...TENSO,
      p_humor: "furioso",
    });
    expect(invalida.error?.code).toBe("22023");

    expect((await b.cliente.rpc("responder_sala_noite", { p_sala: sala, ...TENSO })).error).toBe(
      null,
    );
    const [linha] = await ler(a, sala);
    expect(linha?.respostas_criador).toEqual({
      humor: "cansado",
      experiencia: "rir",
      companhia: "a-dois",
    });
    expect(linha?.respostas_convidado).toEqual({
      humor: "animado",
      experiencia: "tenso",
      companhia: "familia",
    });
  });

  it("ninguém escreve direto na tabela, nem a resposta do outro", async () => {
    const alteracao = await b.cliente
      .from("salas_noite")
      .update({
        respostas_criador: { humor: "ansioso", experiencia: "susto", companhia: "sozinho" },
      })
      .eq("id", sala)
      .select("id");
    expect(alteracao.data ?? []).toEqual([]);
    expect((await ler(a, sala))[0]?.respostas_criador).toMatchObject({ experiencia: "rir" });

    const insercao = await c.cliente.from("salas_noite").insert({ criador_id: c.id });
    expect(insercao.error?.code).toBe("42501");
  });

  it("restricoes_sala_noite soma os perfis das duas pessoas e recusa quem não participa", async () => {
    const base = { generos: [28], duracao: "media" as const, frequencia: "semanal" as const };
    await a.cliente
      .from("preferencias")
      .insert({ ...base, usuario_id: a.id, generos_evitados: [27], streamings: [8] })
      .throwOnError();
    await b.cliente
      .from("preferencias")
      .insert({ ...base, usuario_id: b.id, generos_evitados: [99], streamings: [8, 337] })
      .throwOnError();
    await b.cliente
      .from("lista_itens")
      .insert({ usuario_id: b.id, tmdb_id: 550, status: "assistido", titulo: "Clube da Luta" })
      .throwOnError();
    await a.cliente
      .from("reacoes")
      .insert({ usuario_id: a.id, tmdb_id: 13, reacao: "nao-gostei", titulo: "Forrest Gump" })
      .throwOnError();

    const { data, error } = await b.cliente.rpc("restricoes_sala_noite", { p_sala: sala });
    expect(error).toBeNull();
    const [restricoes] = data ?? [];
    expect([...(restricoes?.evitados ?? [])].sort()).toEqual([27, 99]);
    expect([...(restricoes?.streamings ?? [])].sort()).toEqual([337, 8]);
    expect([...(restricoes?.excluir ?? [])].sort((x, y) => x - y)).toEqual([13, 550]);
    expect(restricoes?.respostas_criador).toMatchObject({ experiencia: "rir" });

    const deC = await c.cliente.rpc("restricoes_sala_noite", { p_sala: sala });
    expect(deC.error?.code).toBe("42501");
  });

  it("o resultado é gravado uma vez só, apaga as respostas e encerra a sala", async () => {
    const deC = await c.cliente.rpc("concluir_sala_noite", {
      p_sala: sala,
      p_resultado: RESULTADO,
    });
    expect(deC.error?.code).toBe("42501");

    const primeira = await b.cliente.rpc("concluir_sala_noite", {
      p_sala: sala,
      p_resultado: RESULTADO,
    });
    expect(primeira).toMatchObject({ data: true, error: null });

    const segunda = await a.cliente.rpc("concluir_sala_noite", {
      p_sala: sala,
      p_resultado: { filmes: [{ id: 1, motivo: "outro" }] },
    });
    expect(segunda.data).toBe(false);

    expect(await ler(a, sala)).toEqual([
      expect.objectContaining({
        respostas_criador: null,
        respostas_convidado: null,
        resultado: RESULTADO,
      }),
    ]);
    const depois = await a.cliente.rpc("responder_sala_noite", { p_sala: sala, ...RIR });
    expect(depois.error?.code).toBe("P0001");
  });

  it("com a vaga livre, quem não entrou na sala também não responde nem lê restrições", async () => {
    const livre = await criarSala(a);
    const resposta = await c.cliente.rpc("responder_sala_noite", { p_sala: livre, ...TENSO });
    expect(resposta.error?.code).toBe("42501");
    const restricoes = await c.cliente.rpc("restricoes_sala_noite", { p_sala: livre });
    expect(restricoes.error?.code).toBe("42501");
    expect((await ler(a, livre))[0]).toMatchObject({
      convidado_id: null,
      respostas_convidado: null,
    });
  });

  it("antes das duas respostas, não há restrições nem resultado", async () => {
    const nova = await criarSala(a);
    expect(await entrar(b, nova)).toBe("convidado");
    await a.cliente.rpc("responder_sala_noite", { p_sala: nova, ...RIR }).throwOnError();

    const restricoes = await a.cliente.rpc("restricoes_sala_noite", { p_sala: nova });
    expect(restricoes.error?.code).toBe("P0001");
    const conclusao = await a.cliente.rpc("concluir_sala_noite", {
      p_sala: nova,
      p_resultado: RESULTADO,
    });
    expect(conclusao.error?.code).toBe("P0001");
  });

  it("a sala expirada não é lida por ninguém e não aceita entrada nem resposta", async () => {
    const curta = await criarSala(a, 1);
    expect(await ler(a, curta)).toHaveLength(1);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    expect(await ler(a, curta)).toEqual([]);
    expect(await entrar(b, curta)).toBe("expirada");
    const resposta = await a.cliente.rpc("responder_sala_noite", { p_sala: curta, ...RIR });
    expect(resposta.error?.code).toBe("P0001");
  });

  it("a validade nunca passa de 3 h", async () => {
    const { error } = await a.cliente.rpc("criar_sala_noite", { p_segundos: 3 * 3600 + 1 });
    expect(error?.code).toBe("22023");
  });
});
