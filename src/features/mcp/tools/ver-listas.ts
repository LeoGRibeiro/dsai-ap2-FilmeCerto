import { z } from "zod";

import { STATUS_LISTA } from "@/features/listas/opcoes";
import type { DefinicaoTool } from "@/features/mcp/contexto";
import { erro, linkFilme, MSG, ok } from "@/features/mcp/formatar";

const entrada = z.object({ lista: z.enum(STATUS_LISTA).optional() });

export const verListas: DefinicaoTool<typeof entrada> = {
  nome: "ver_listas",
  titulo: "Ver minhas listas",
  descricao:
    "Filmes das listas 'Quero assistir' e 'Já assisti' do usuário. Use para saber o que ele quer ver ou já viu.",
  entrada,
  anotacoes: { readOnlyHint: true, openWorldHint: false },
  async executar({ lista }, ctx) {
    let itens;
    try {
      itens = await ctx.dados.itensLista();
    } catch {
      return erro(MSG.banco);
    }
    const daLista = (status: (typeof STATUS_LISTA)[number]) =>
      itens
        .filter((i) => i.status === status)
        .map((i) => ({ tmdb_id: i.tmdbId, titulo: i.titulo, ano: i.ano, minha_reacao: i.reacao, link: linkFilme(ctx.origem, i.tmdbId) }));
    const listas = lista ? [lista] : STATUS_LISTA;
    return ok(Object.fromEntries(listas.map((s) => [s, daLista(s)])));
  },
};
