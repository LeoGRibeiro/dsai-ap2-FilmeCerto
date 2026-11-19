import { formatarDuracao } from "@/features/filme/formatar";
import type { Episodio, Temporada } from "@/lib/tmdb/tipos";

/** "2026-12-12" → "12/12/2026". */
export function formatarData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Data `AAAA-MM-DD` depois de `hoje` (o dia em São Paulo, no mesmo formato). */
export function eFutura(data: string | null | undefined, hoje: string): data is string {
  return !!data && data > hoje;
}

/** "cerca de 7h 30min", arredondado para 5 min; `null` sem tempo. */
export function cercaDe(minutos: number | null): string | null {
  const duracao = formatarDuracao(Math.round((minutos ?? 0) / 5) * 5);
  return duracao && `cerca de ${duracao}`;
}

/**
 * Tempo para ver os episódios já exibidos: a duração de cada um ou, onde falta, a do episódio
 * da série. Os que ainda não foram exibidos não contam.
 */
export function tempoDaTemporada(
  episodios: Episodio[],
  duracaoEpisodioMin: number | null,
  hoje: string,
): string | null {
  const minutos = episodios
    .filter((episodio) => episodio.data && !eFutura(episodio.data, hoje))
    .reduce((soma, episodio) => soma + (episodio.duracaoMin ?? duracaoEpisodioMin ?? 0), 0);
  return cercaDe(minutos);
}

/** "45min · 03/10/2025 · ★ 8.1"; o não exibido diz "Estreia em ..." e não tem nota. */
export function detalhesDoEpisodio(episodio: Episodio, hoje: string): string {
  const futuro = eFutura(episodio.data, hoje);
  const data = episodio.data && formatarData(episodio.data);
  return [
    formatarDuracao(episodio.duracaoMin),
    futuro ? `Estreia em ${data}` : data,
    !futuro && episodio.nota !== null ? `★ ${episodio.nota.toFixed(1)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Temporadas antes e depois de `numero`, pela lista da série (que já vem sem a 0). */
export function vizinhas(temporadas: Temporada[], numero: number) {
  return {
    anterior: temporadas.filter((temporada) => temporada.numero < numero).at(-1) ?? null,
    proxima: temporadas.find((temporada) => temporada.numero > numero) ?? null,
  };
}
