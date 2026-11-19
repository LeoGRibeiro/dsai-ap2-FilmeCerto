import { formatarDuracao, formatarNota } from "@/features/filme/formatar";
import { eFutura, formatarData } from "@/features/serie/temporada";
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

/** `status` do TMDB em português; os que não estão aqui não aparecem. */
const SITUACOES: Record<string, string> = {
  "Returning Series": "Em exibição",
  Ended: "Encerrada",
  Canceled: "Cancelada",
  "In Production": "Em produção",
  Planned: "Em produção",
};

export function rotuloSituacao(status: string | null | undefined): string | null {
  return (status && SITUACOES[status]) || null;
}

/** "Próximo episódio em 12/12/2026", só quando a data é depois de `hoje` (AAAA-MM-DD). */
export function proximoEpisodio(serie: SerieDetalhes, hoje: string): string | null {
  const data = serie.proximoEpisodio;
  return eFutura(data, hoje) ? `Próximo episódio em ${formatarData(data)}` : null;
}

/** Linha de dados do cabeçalho: ano · temporadas · situação · episódio · classificação · nota. */
export function dadosDaSerie(serie: SerieDetalhes): (string | null)[] {
  const episodio = formatarDuracao(serie.duracaoEpisodioMin);
  return [
    serie.ano ? String(serie.ano) : null,
    serie.temporadas.length > 0 ? contar(serie.temporadas.length, "temporada", "temporadas") : null,
    rotuloSituacao(serie.situacao),
    episodio ? `Episódios de ${episodio}` : null,
    rotuloClassificacao(serie.classificacao),
    formatarNota(serie.nota, serie.votos),
  ];
}
