import { beforeAll, describe, expect, it } from "vitest";

import { criarUsuario } from "../../support/supabase-local";

type Usuario = Awaited<ReturnType<typeof criarUsuario>>;

async function salaDeDois(criador: Usuario, convidado: Usuario) {
  const { data: sala, error } = await criador.cliente.rpc("criar_sala_noite", {});
  if (error || !sala) throw error ?? new Error("criar_sala_noite não devolveu o ID");
  const entrada = await convidado.cliente.rpc("entrar_sala_noite", { p_sala: sala });
  if (entrada.error) throw entrada.error;
  return sala;
}

async function filtroNaSala(usuario: Usuario, sala: string) {
  const { data, error } = await usuario.cliente.rpc("filtro_na_sala_noite", { p_sala: sala });
  if (error) throw error;
  return data;
}

describe("filtro_na_sala_noite", () => {
  let a: Usuario;
  let b: Usuario;
  let c: Usuario;
  let sala: string;

  beforeAll(async () => {
    [a, b, c] = await Promise.all([
      criarUsuario("Usuária A"),
      criarUsuario("Usuário B"),
      criarUsuario("Usuária C"),
    ]);
    sala = await salaDeDois(a, b);
  });

  it("sem filtro nenhum, é false para os dois", async () => {
    expect(await filtroNaSala(a, sala)).toBe(false);
    expect(await filtroNaSala(b, sala)).toBe(false);
  });

  it("basta um dos dois ter filtro, e os dois recebem true", async () => {
    await b.cliente.from("filtros_conteudo").insert({ limite: "14" });
    expect(await filtroNaSala(a, sala)).toBe(true);
    expect(await filtroNaSala(b, sala)).toBe(true);
  });

  it("quem não está na sala recebe false, mesmo com o filtro de um participante", async () => {
    expect(await filtroNaSala(c, sala)).toBe(false);
  });
});
