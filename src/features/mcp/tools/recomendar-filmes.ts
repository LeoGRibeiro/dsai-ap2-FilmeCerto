import { z } from "zod";

import type { DefinicaoTool } from "@/features/mcp/contexto";
import { erro, MSG, ok, resumoFilme } from "@/features/mcp/formatar";
import { gerarRecomendacoes } from "@/features/recomendacao/gerar";

const entrada = z.object({
  por_secao: z.number().int().min(1).max(20).default(5),
  rodada: z.number().int().min(0).max(9999).default(0),
});

export const recomendarFilmes: DefinicaoTool<typeof entrada> = {
  nome: "recomendar_filmes",
  titulo: "Recomendar filmes",
  descricao:
    "Sugestões personalizadas do motor do Filme Certo, a partir dos gostos, streamings, avaliações e listas do usuário. Use quando o usuário pedir algo para assistir. Filmes já avaliados ou nas listas não aparecem. Para outras sugestões, chame de novo com uma rodada maior.",
  entrada,
  anotacoes: { readOnlyHint: true, openWorldHint: true },
  async executar({ por_secao, rodada }, ctx) {
    let preferencias, reacoes, excluir;
    try {
      preferencias = await ctx.dados.preferencias();
      if (!preferencias) return erro(MSG.semPreferencias(ctx.origem));
      [reacoes, excluir] = await Promise.all([ctx.dados.reacoes(), ctx.dados.idsNasListas()]);
    } catch {
      return erro(MSG.banco);
    }

    const secoes = await gerarRecomendacoes(
      { preferencias, usuarioId: ctx.usuarioId, data: ctx.agora(), rodada, reacoes, excluir },
      ctx.motor,
    );
    const validas = secoes.filter((s) => !s.erro && s.filmes.length > 0);
    if (validas.length === 0 && secoes.some((s) => s.erro)) return erro(MSG.tmdb);

    return ok({
      rodada,
      secoes: validas.map((s) => ({
        titulo: s.titulo,
        filmes: s.filmes.slice(0, por_secao).map((f) => ({ ...resumoFilme(f, ctx.origem), motivo: f.motivo })),
      })),
    });
  },
};
