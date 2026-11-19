import type { Clima } from "@/features/metricas/eventos";
import {
  MAPEAMENTO_FILME,
  ORDEM_PADRAO,
  PISO,
  type Mapeamento,
  type Tom,
} from "@/features/noite/mapeamento";
import { MAPEAMENTO_SERIE } from "@/features/noite/mapeamento-serie";
import type { TipoMidia } from "@/lib/midia";
import type { ClassificacaoBR, FiltrosDescoberta } from "@/lib/tmdb/tipos";

/** As tabelas de cada tipo (SPEC/2026-11-18-wizard-noite.md e SPEC/2026-11-18-series-noite.md). */
export const MAPEAMENTOS: Record<TipoMidia, Mapeamento> = {
  filme: MAPEAMENTO_FILME,
  serie: MAPEAMENTO_SERIE,
};

export type RodadaNoite = {
  respostas: Clima;
  /** Índice do tom ("Não é o clima" avança). */
  tom: number;
  /** Limite de duração vindo de "Muito longo", se houver. */
  duracaoMax: number | null;
  /** Minutos até a hora do "Até que horas?", se houver. */
  tempo?: number | null;
  /** Filme (o padrão) ou série. */
  tipo?: TipoMidia;
};

export type FiltrosNoite = {
  filtros: FiltrosDescoberta;
  tom: Tom;
  /** Os gêneros evitados do perfil nos IDs do tipo, para conferir o resultado. */
  evitados: number[];
  /** Classificação máxima a conferir nos detalhes, quando o TMDB não a filtra (séries). */
  classificacaoNosDetalhes: ClassificacaoBR | null;
};

/**
 * Filtros do TMDB para a rodada, pelas tabelas do tipo. A experiência escolhe o tom; o humor e
 * a companhia ajustam; os gêneros evitados do perfil são absolutos, e os favoritos não entram.
 * `null` se todos os tons tiverem gênero evitado.
 */
export function filtrosDaNoite(
  rodada: RodadaNoite,
  evitadosDoPerfil: readonly number[],
): FiltrosNoite | null {
  const { respostas, tom, duracaoMax, tempo, tipo = "filme" } = rodada;
  const mapa = MAPEAMENTOS[tipo];
  const evitados = mapa.evitados(evitadosDoPerfil);
  const experiencia = mapa.tons[respostas.experiencia];
  if (experiencia.evitadaSe?.some((g) => evitadosDoPerfil.includes(g))) return null;
  const disponiveis = experiencia.tons.filter((t) => !t.generos.some((g) => evitados.includes(g)));
  const escolhido = disponiveis[tom % disponiveis.length];
  if (!escolhido) return null;

  const humor = mapa.humor[respostas.humor];
  const companhia = mapa.companhia[respostas.companhia];
  // A experiência manda mais que o humor: o humor não exclui o gênero do tom.
  const semDoHumor = (humor.sem ?? []).filter((g) => !escolhido.generos.includes(g));
  const semGeneros = [
    ...new Set([...evitados, ...(experiencia.sem ?? []), ...semDoHumor, ...mapa.sempreSem]),
  ];
  // "Cansado", "Muito longo" e "Até que horas?": vale o menor limite.
  const limites = [humor.duracaoMax, duracaoMax, tempo].filter((n) => typeof n === "number");
  const classificacao = companhia.classificacaoMax ?? null;
  const noTmdb = mapa.classificacaoNoTmdb ? classificacao : null;

  return {
    tom: escolhido,
    evitados,
    classificacaoNosDetalhes: mapa.classificacaoNoTmdb ? null : classificacao,
    filtros: {
      todosGeneros: escolhido.generos,
      ...(semGeneros.length > 0 && { semGeneros }),
      ...(limites.length > 0 && { duracaoMax: Math.min(...limites) }),
      ...(humor.lancadoAte && { lancadoAte: humor.lancadoAte }),
      ...(noTmdb && { classificacaoMax: noTmdb }),
      notaMin: PISO.notaMin,
      votosMin: PISO.votosMin,
      ordem: humor.ordem ?? companhia.ordem ?? ORDEM_PADRAO,
    },
  };
}
