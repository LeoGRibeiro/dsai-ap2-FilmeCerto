import { formatarDuracao, formatarNota } from "@/features/filme/formatar";
import type { ClassificacaoBR, SerieDetalhes } from "@/lib/tmdb/tipos";

/** "1 temporada", "2 temporadas". */
export function contar(quantidade: number, singular: string, plural: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

/** "Livre" ou "12 anos"; `null` sem classificação no Brasil. */
export function rotuloClassificacao(classificacao: ClassificacaoBR | null): string | null {
  if (!classificacao) return null;
  return classificacao === "L" ? "Livre" : `${classificacao} anos`;
}

/** Linha de dados do cabeçalho: ano · temporadas · episódio · classificação · nota. */
export function dadosDaSerie(serie: SerieDetalhes): (string | null)[] {
  const episodio = formatarDuracao(serie.duracaoEpisodioMin);
  return [
    serie.ano ? String(serie.ano) : null,
    serie.temporadas.length > 0 ? contar(serie.temporadas.length, "temporada", "temporadas") : null,
    episodio ? `Episódios de ${episodio}` : null,
    rotuloClassificacao(serie.classificacao),
    formatarNota(serie.nota, serie.votos),
  ];
}
