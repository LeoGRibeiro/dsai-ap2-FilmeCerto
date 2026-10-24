import { z } from "zod";

import type { DefinicaoTool } from "@/features/mcp/contexto";
import { erro, linkFilme, MSG, ok } from "@/features/mcp/formatar";
import { nomesPorServico } from "@/features/mcp/provedores";
import { tmdbIdSchema } from "@/features/reacoes/schema";

const MAX_ELENCO = 5;
const entrada = z.object({ tmdb_id: tmdbIdSchema });

export const detalhesFilme: DefinicaoTool<typeof entrada> = {
  nome: "detalhes_filme",
  titulo: "Detalhes do filme",
  descricao:
    "Detalhes de um filme pelo tmdb_id, incluindo onde assistir no Brasil e se ele está nos streamings do usuário, numa lista dele ou já avaliado. Use quando o usuário perguntar onde assistir ou quiser saber mais de um filme.",
  entrada,
  anotacoes: { readOnlyHint: true, openWorldHint: true },
  async executar({ tmdb_id }, ctx) {
    let filme;
    try {
      filme = await ctx.tmdb.obterFilme(tmdb_id);
    } catch {
      return erro(MSG.tmdb);
    }
    if (!filme) return erro(MSG.naoEncontrado);

    let preferencias, estado;
    try {
      [preferencias, estado] = await Promise.all([ctx.dados.preferencias(), ctx.dados.estadoFilme(tmdb_id)]);
    } catch {
      return erro(MSG.banco);
    }
    const meus = new Set(preferencias?.streamings ?? []);
    const onde = filme.ondeAssistir;

    return ok({
      tmdb_id: filme.id,
      titulo: filme.titulo,
      titulo_original: filme.tituloOriginal,
      ano: filme.ano,
      generos: filme.generos.map((g) => g.nome),
      duracao_min: filme.duracaoMin,
      nota: Math.round(filme.nota * 10) / 10,
      votos: filme.votos,
      sinopse: filme.sinopse,
      direcao: filme.direcao,
      elenco: filme.elenco.slice(0, MAX_ELENCO).map((p) => p.nome),
      onde_assistir: onde
        ? {
            assinatura: nomesPorServico(onde.assinatura),
            aluguel: nomesPorServico(onde.aluguel),
            compra: nomesPorServico(onde.compra),
          }
        : null,
      nos_meus_streamings: onde ? nomesPorServico(onde.assinatura, meus) : [],
      minha_lista: estado.lista,
      minha_reacao: estado.reacao,
      link: linkFilme(ctx.origem, filme.id),
    });
  },
};
