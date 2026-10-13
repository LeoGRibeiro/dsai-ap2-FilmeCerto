import { z } from "zod";

import type { ResultadoDefinir } from "@/features/listas/gravar";
import { STATUS_LISTA } from "@/features/listas/opcoes";
import type { DefinicaoTool, ResultadoTool } from "@/features/mcp/contexto";
import { erro, MSG, ok } from "@/features/mcp/formatar";
import { tmdbIdSchema } from "@/features/reacoes/schema";

const entrada = z.object({
  tmdb_id: tmdbIdSchema,
  lista: z.enum([...STATUS_LISTA, "nenhuma"]),
});

/** Mensagem de erro comum às tools de escrita. */
export function erroDeEscrita(r: Extract<ResultadoDefinir<unknown>, { ok: false }>): ResultadoTool {
  if (r.erro === "filme-nao-encontrado") return erro(MSG.naoEncontrado);
  return erro(r.erro === "tmdb" ? MSG.tmdb : MSG.banco);
}

export const marcarNaLista: DefinicaoTool<typeof entrada> = {
  nome: "marcar_na_lista",
  titulo: "Marcar filme numa lista",
  descricao:
    "Põe o filme em 'Quero assistir' ou 'Já assisti', ou tira das listas com 'nenhuma'. Um filme fica em uma lista por vez. Repetir a chamada não muda nada. Use só quando o usuário pedir.",
  entrada,
  anotacoes: { readOnlyHint: false, idempotentHint: true, destructiveHint: false, openWorldHint: false },
  async executar({ tmdb_id, lista }, ctx) {
    const r = await ctx.dados.definirLista(tmdb_id, lista === "nenhuma" ? null : lista);
    if (!r.ok) return erroDeEscrita(r);
    return ok({ tmdb_id, titulo: r.titulo, lista: r.atual ?? "nenhuma", lista_anterior: r.anterior ?? "nenhuma" });
  },
};
