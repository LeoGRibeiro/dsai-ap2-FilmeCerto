import type { EpisodioPrevisto, SerieDetalhes } from "@/lib/tmdb/tipos";

/** Linha de `avisos_episodios` a gravar, sem `usuario_id` e sem `lido_em`. */
export type EpisodioParaAvisar = {
  serie_tmdb_id: number;
  serie_titulo: string;
  episodio_tmdb_id: number | null;
  temporada_numero: number;
  episodio_numero: number;
  episodio_nome: string;
  data_estreia: string;
};

/** Um aviso não lido, como o cartão do início mostra. */
export type AvisoEpisodio = {
  id: string;
  serieTmdbId: number;
  serieTitulo: string;
  temporada: number;
  episodio: number;
  dataEstreia: string;
};

export type SerieComEpisodios = Pick<
  SerieDetalhes,
  "id" | "titulo" | "proximoEpisodioDetalhes" | "ultimoEpisodioDetalhes"
>;

/** Os textos do banco têm de 1 a 300 caracteres. */
const LIMITE_TEXTO = 300;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

function paraLinha(
  serie: SerieComEpisodios,
  episodio: EpisodioPrevisto | null | undefined,
): EpisodioParaAvisar | null {
  if (!episodio) return null;
  const { temporadaNumero: temporada, episodioNumero: numero, data } = episodio;
  // Sem data ou sem número, não dá para avisar; a temporada 0 (especiais) não tem página.
  if (!data || !DATA.test(data) || !temporada || temporada < 1 || !numero || numero < 1) {
    return null;
  }
  return {
    serie_tmdb_id: serie.id,
    serie_titulo: serie.titulo.slice(0, LIMITE_TEXTO),
    episodio_tmdb_id: episodio.id,
    temporada_numero: temporada,
    episodio_numero: numero,
    episodio_nome: (episodio.nome || `Episódio ${numero}`).slice(0, LIMITE_TEXTO),
    data_estreia: data,
  };
}

/**
 * Episódios da série que viram aviso (SPEC/2026-11-25-avisos-episodios.md): o próximo, se tiver
 * data, e o último exibido, se foi ao ar a partir de `desde` (o dia, `AAAA-MM-DD`, em que a pessoa
 * passou a acompanhar). O mesmo episódio nos dois vira uma linha só, que o `upsert` exige.
 */
export function episodiosParaAvisar(serie: SerieComEpisodios, desde: string): EpisodioParaAvisar[] {
  if (!serie.titulo.trim()) return [];
  const ultimo = serie.ultimoEpisodioDetalhes;
  const linhas = [
    ultimo?.data && ultimo.data >= desde ? paraLinha(serie, ultimo) : null,
    paraLinha(serie, serie.proximoEpisodioDetalhes),
  ].filter((linha) => linha !== null);

  const [primeira, segunda] = linhas;
  if (
    primeira &&
    segunda &&
    primeira.temporada_numero === segunda.temporada_numero &&
    primeira.episodio_numero === segunda.episodio_numero
  ) {
    return [segunda];
  }
  return linhas;
}

/** "Saiu o episódio 8 da temporada 2 de Ruptura". */
export function textoDoAviso(aviso: AvisoEpisodio): string {
  return `Saiu o episódio ${aviso.episodio} da temporada ${aviso.temporada} de ${aviso.serieTitulo}`;
}
