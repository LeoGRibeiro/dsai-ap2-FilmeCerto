import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { beforeAll, describe, expect, it } from "vitest";

import { SUPABASE_LOCAL, criarUsuario } from "../../support/supabase-local";

process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_LOCAL.url;
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = SUPABASE_LOCAL.publishableKey;
process.env.TMDB_READ_TOKEN ??= "token-teste";

const { POST } = await import("@/app/api/mcp/route");
const { GET: metadados } = await import("@/app/.well-known/oauth-protected-resource/api/mcp/route");

const URL_MCP = "http://localhost:3000/api/mcp";

async function conectar(token: string) {
  const transporte = new StreamableHTTPClientTransport(new URL(URL_MCP), {
    // Desvia as chamadas do cliente para o handler da rota, sem subir servidor.
    fetch: (url, init) => {
      const headers = new Headers(init?.headers);
      headers.set("Authorization", `Bearer ${token}`);
      return POST(new Request(url, { ...init, headers }));
    },
  });
  const cliente = new Client({ name: "teste", version: "1.0.0" });
  await cliente.connect(transporte);
  return cliente;
}

const texto = (r: unknown) => (r as { content: { text: string }[] }).content[0].text;

describe("/api/mcp", () => {
  let a: Awaited<ReturnType<typeof criarUsuario>>;
  let b: Awaited<ReturnType<typeof criarUsuario>>;
  let tokenA: string;

  beforeAll(async () => {
    a = await criarUsuario("Agente A");
    b = await criarUsuario("Agente B");
    tokenA = (await a.cliente.auth.getSession()).data.session!.access_token;
    const { error } = await b.cliente.from("lista_itens").insert({
      usuario_id: b.id, tmdb_id: 550, status: "assistido", titulo: "Do B", poster_path: null, ano: 1999, generos: [18],
    });
    if (error) throw error;
  });

  it("sem token ou com token inválido responde 401 com WWW-Authenticate", async () => {
    for (const auth of [undefined, "Bearer lixo"]) {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (auth) headers.Authorization = auth;
      const r = await POST(new Request(URL_MCP, { method: "POST", headers, body: "{}" }));
      expect(r.status).toBe(401);
      expect(r.headers.get("WWW-Authenticate")).toContain(
        'resource_metadata="http://localhost:3000/.well-known/oauth-protected-resource/api/mcp"',
      );
    }
  });

  it("metadados apontam para o Auth do Supabase", async () => {
    const r = metadados(new Request("http://localhost:3000/.well-known/oauth-protected-resource/api/mcp"));
    expect(await r.json()).toMatchObject({
      resource: "http://localhost:3000/api/mcp",
      authorization_servers: [`${SUPABASE_LOCAL.url}/auth/v1`],
    });
  });

  it("lista as seis tools, com anotações", async () => {
    const cliente = await conectar(tokenA);
    const { tools } = await cliente.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(
      ["avaliar_filme", "buscar_filmes", "detalhes_filme", "marcar_na_lista", "recomendar_filmes", "ver_listas"],
    );
    expect(tools.find((t) => t.name === "ver_listas")?.annotations?.readOnlyHint).toBe(true);
  });

  it("com o token de A, ver_listas não mostra itens de B e a escrita não toca em B", async () => {
    const cliente = await conectar(tokenA);
    expect(JSON.parse(texto(await cliente.callTool({ name: "ver_listas", arguments: {} })))).toEqual({
      quero_assistir: [], assistido: [],
    });
    const r = JSON.parse(texto(await cliente.callTool({ name: "marcar_na_lista", arguments: { tmdb_id: 550, lista: "nenhuma" } })));
    expect(r.lista_anterior).toBe("nenhuma");
    const { data } = await b.cliente.from("lista_itens").select("status").single();
    expect(data?.status).toBe("assistido");
  });

  it("recomendar_filmes sem onboarding pede o cadastro de gostos", async () => {
    const cliente = await conectar(tokenA);
    const r = await cliente.callTool({ name: "recomendar_filmes", arguments: {} });
    expect(r.isError).toBe(true);
    expect(texto(r)).toContain("/onboarding");
  });

  it("entrada inválida vira resultado de erro, não queda", async () => {
    const cliente = await conectar(tokenA);
    // O SDK captura a falha de validação do schema e devolve isError (não rejeita).
    const r = await cliente.callTool({ name: "marcar_na_lista", arguments: { tmdb_id: "abc" } });
    expect(r.isError).toBe(true);
    expect((await cliente.listTools()).tools).toHaveLength(6);
  });
});
