import { z } from "zod";

import type { DefinicaoTool } from "@/features/mcp/contexto";
import { encurtar, erro, MSG, ok, resumoFilme } from "@/features/mcp/formatar";

const entrada = z.object({
  texto: z.string().trim().min(2).max(100),
  pagina: z.number().int().min(1).max(500).default(1),
});

export const buscarFilmes: DefinicaoTool<typeof entrada> = {
  nome: "buscar_filmes",
  titulo: "Buscar filmes",
  descricao:
    "Busca filmes pelo nome no catálogo do Filme Certo. Use quando o usuário citar um filme pelo nome e você precisar do tmdb_id para outra tool. Não traz onde assistir nem dados do usuário.",
  entrada,
  anotacoes: { readOnlyHint: true, openWorldHint: true },
  async executar({ texto, pagina }, ctx) {
    try {
      const resultado = await ctx.tmdb.buscarFilmes(texto, pagina);
      return ok({
        pagina: resultado.pagina,
        total_paginas: resultado.totalPaginas,
        filmes: resultado.itens.map((f) => ({ ...resumoFilme(f, ctx.origem), sinopse: encurtar(f.sinopse) })),
      });
    } catch {
      return erro(MSG.tmdb);
    }
  },
};
