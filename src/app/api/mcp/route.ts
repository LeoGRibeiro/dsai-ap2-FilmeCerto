import { createMcpHandler, withMcpAuth } from "mcp-handler";

import { RECURSO_METADADOS, verificarToken } from "@/features/mcp/autenticacao";
import { INSTRUCOES, registrarTools } from "@/features/mcp/servidor";

const handler = createMcpHandler(registrarTools, {
  serverInfo: { name: "filme-certo", version: "1.0.0" },
  instructions: INSTRUCOES,
});

/** Servidor MCP do Filme Certo (spec `mcp`). Toda chamada exige o token OAuth do usuário. */
const autenticado = withMcpAuth(handler, verificarToken, {
  required: true,
  resourceMetadataPath: RECURSO_METADADOS,
});

export { autenticado as GET, autenticado as POST };
