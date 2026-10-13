import { z } from "zod";

import type { DefinicaoTool } from "@/features/mcp/contexto";
import { ok } from "@/features/mcp/formatar";
import { erroDeEscrita } from "@/features/mcp/tools/marcar-na-lista";
import { REACOES } from "@/features/reacoes/opcoes";
import { tmdbIdSchema } from "@/features/reacoes/schema";

const entrada = z.object({
  tmdb_id: tmdbIdSchema,
  reacao: z.enum([...REACOES, "nenhuma"]),
});

export const avaliarFilme: DefinicaoTool<typeof entrada> = {
  nome: "avaliar_filme",
  titulo: "Avaliar filme",
  descricao:
    "Registra o que o usuário achou do filme: 'amei', 'gostei' ou 'nao-gostei' (Não é pra mim). 'nenhuma' apaga a reação. Muda as próximas recomendações. Use só quando o usuário disser o que achou.",
  entrada,
  anotacoes: { readOnlyHint: false, idempotentHint: true, destructiveHint: false, openWorldHint: false },
  async executar({ tmdb_id, reacao }, ctx) {
    const r = await ctx.dados.definirReacao(tmdb_id, reacao === "nenhuma" ? null : reacao);
    if (!r.ok) return erroDeEscrita(r);
    return ok({ tmdb_id, titulo: r.titulo, reacao: r.atual ?? "nenhuma", reacao_anterior: r.anterior ?? "nenhuma" });
  },
};
