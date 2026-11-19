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

type Montagem = {
  tom: Tom;
  /** Respostas de quem vai assistir: uma pessoa no wizard, duas na "Noite a dois". */
  respostas: Clima[];
  /** Gêneros evitados do perfil, já nos IDs do tipo (absolutos). */
  evitados: number[];
  /** Exclusões fixas das experiências; perdem para o gênero do tom. */
  semDasExperiencias?: number[];
  /** Outros limites de duração ("Muito longo", "Até que horas?"). */
  limites?: (number | null | undefined)[];
  /** Tabelas do tipo; o padrão é filme. */
  mapa?: Mapeamento;
};

/**
 * Os ajustes de humor e companhia de todas as respostas, juntos: vale o menor limite de
 * duração, qualquer `nostalgico` limita a época, qualquer "família" limita a classificação.
 * A experiência manda mais que o humor: nenhuma exclusão tira um gênero do tom.
 */
export function montarFiltros({
  tom,
  respostas,
  evitados,
  semDasExperiencias = [],
  limites = [],
  mapa = MAPEAMENTO_FILME,
}: Montagem): FiltrosNoite {
  const humores = respostas.map(({ humor }) => mapa.humor[humor]);
  const companhias = respostas.map(({ companhia }) => mapa.companhia[companhia]);
  const semDoTom = [...semDasExperiencias, ...humores.flatMap((h) => h.sem ?? [])].filter(
    (g) => !tom.generos.includes(g),
  );
  const semGeneros = [...new Set([...evitados, ...semDoTom, ...mapa.sempreSem])];
  const duracoes = [...humores.map((h) => h.duracaoMax), ...limites].filter(
    (n) => typeof n === "number",
  );
  const lancadoAte = humores.find((h) => h.lancadoAte)?.lancadoAte;
  const classificacao = companhias.find((c) => c.classificacaoMax)?.classificacaoMax ?? null;
  const noTmdb = mapa.classificacaoNoTmdb ? classificacao : null;
  const ordem =
    humores.find((h) => h.ordem)?.ordem ?? companhias.find((c) => c.ordem)?.ordem ?? ORDEM_PADRAO;

  return {
    tom,
    evitados,
    classificacaoNosDetalhes: mapa.classificacaoNoTmdb ? null : classificacao,
    filtros: {
      todosGeneros: tom.generos,
      ...(semGeneros.length > 0 && { semGeneros }),
      ...(duracoes.length > 0 && { duracaoMax: Math.min(...duracoes) }),
      ...(lancadoAte && { lancadoAte }),
      ...(noTmdb && { classificacaoMax: noTmdb }),
      notaMin: PISO.notaMin,
      votosMin: PISO.votosMin,
      ordem,
    },
  };
}

/** O tom não tem gênero evitado. */
export function tomPermitido(tom: Tom, evitados: readonly number[]): boolean {
  return !tom.generos.some((g) => evitados.includes(g));
}

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
  const disponiveis = experiencia.tons.filter((t) => tomPermitido(t, evitados));
  const escolhido = disponiveis[tom % disponiveis.length];
  if (!escolhido) return null;

  // "Cansado", "Muito longo" e "Até que horas?": vale o menor limite.
  return montarFiltros({
    tom: escolhido,
    respostas: [respostas],
    evitados,
    semDasExperiencias: experiencia.sem,
    limites: [duracaoMax, tempo],
    mapa,
  });
}
