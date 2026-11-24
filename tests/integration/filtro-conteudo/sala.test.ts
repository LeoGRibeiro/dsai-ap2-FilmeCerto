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

async function limiteNaSala(usuario: Usuario, sala: string) {
  const { data, error } = await usuario.cliente.rpc("limite_filtro_sala_noite", { p_sala: sala });
  if (error) throw error;
  return data;
}

describe("limite_filtro_sala_noite", () => {
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

  it("sem filtro nenhum, é null para os dois", async () => {
    expect(await limiteNaSala(a, sala)).toBeNull();
    expect(await limiteNaSala(b, sala)).toBeNull();
  });

  it("com o filtro de um dos dois, os dois recebem o limite dele", async () => {
    await b.cliente.from("filtros_conteudo").insert({ limite: "14" });
    expect(await limiteNaSala(a, sala)).toBe("14");
    expect(await limiteNaSala(b, sala)).toBe("14");
  });

  it("com os dois filtros, vale o mais restrito", async () => {
    await a.cliente.from("filtros_conteudo").insert({ limite: "18" });
    expect(await limiteNaSala(a, sala)).toBe("14");
    await a.cliente.from("filtros_conteudo").update({ limite: "10" }).eq("usuario_id", a.id);
    expect(await limiteNaSala(b, sala)).toBe("10");
  });

  it("quem não está na sala recebe null, mesmo com o filtro dos participantes", async () => {
    expect(await limiteNaSala(c, sala)).toBeNull();
  });
});
