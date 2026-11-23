import type { FiltroConteudo, ModoFiltro } from "@/features/filtro-conteudo/opcoes";
import { ateAClassificacao, CLASSIFICACOES_BR } from "@/lib/tmdb/classificacao";
import type { ClassificacaoBR } from "@/lib/tmdb/tipos";

/** Onde o título aparece: cada tela trata de um jeito o que passa do limite. */
export type Tela = "recomendacao" | "busca" | "lista" | "pagina";

/**
 * - `borrado`: imagens borradas, selo e "Mostrar"; `borrado-fixo`: sem "Mostrar".
 * - `oculto`: o título sai da tela.
 * - `aviso`: a página abre com "Ver mesmo assim"; `bloqueado`: a página não mostra o conteúdo.
 */
export type Tratamento = "normal" | "borrado" | "borrado-fixo" | "oculto" | "aviso" | "bloqueado";

/** A tabela "Tratamento por tela" da spec. */
const TRATAMENTOS: Record<Tela, Record<ModoFiltro, Tratamento>> = {
  recomendacao: { avisar: "borrado", ocultar: "oculto", bloquear: "oculto" },
  busca: { avisar: "borrado", ocultar: "borrado", bloquear: "oculto" },
  lista: { avisar: "borrado", ocultar: "borrado", bloquear: "borrado-fixo" },
  pagina: { avisar: "borrado", ocultar: "aviso", bloquear: "bloqueado" },
};

/** Passa do limite: classificação acima dele ou desconhecida (`null`). */
export function acimaDoLimite(
  classificacao: ClassificacaoBR | null | undefined,
  limite: ClassificacaoBR,
): boolean {
  return !ateAClassificacao(classificacao, limite);
}

/** Como mostrar um título nesta tela. Com o filtro desligado, sempre `normal`. */
export function tratamento(
  tela: Tela,
  classificacao: ClassificacaoBR | null | undefined,
  filtro: FiltroConteudo | null,
): Tratamento {
  if (!filtro || !acimaDoLimite(classificacao, filtro.limite)) return "normal";
  return TRATAMENTOS[tela][filtro.modo];
}

/** O limite que tira títulos das recomendações: só com Ocultar ou Bloquear. */
export function limiteDasRecomendacoes(filtro: FiltroConteudo | null): ClassificacaoBR | null {
  return filtro && filtro.modo !== "avisar" ? filtro.limite : null;
}

/** O menor dos limites dados (família, filtro, a outra pessoa da sala); `null` sem nenhum. */
export function limiteMaisRestrito(
  ...limites: (ClassificacaoBR | null | undefined)[]
): ClassificacaoBR | null {
  const dados = limites.filter((limite): limite is ClassificacaoBR => !!limite);
  if (dados.length === 0) return null;
  return CLASSIFICACOES_BR[Math.min(...dados.map((limite) => CLASSIFICACOES_BR.indexOf(limite)))]!;
}
