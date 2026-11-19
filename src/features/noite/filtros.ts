import type { Clima } from "@/features/metricas/eventos";
import {
  AJUSTES_COMPANHIA,
  AJUSTES_HUMOR,
  ORDEM_PADRAO,
  PISO,
  TONS,
  type Tom,
} from "@/features/noite/mapeamento";
import type { FiltrosDescoberta } from "@/lib/tmdb/tipos";

export type RodadaNoite = {
  respostas: Clima;
  /** Índice do tom ("Não é o clima" avança). */
  tom: number;
  /** Limite de duração vindo de "Muito longo", se houver. */
  duracaoMax: number | null;
  /** Minutos até a hora do "Até que horas?", se houver. */
  tempo?: number | null;
};

export type FiltrosNoite = { filtros: FiltrosDescoberta; tom: Tom };

type Montagem = {
  tom: Tom;
  /** Respostas de quem vai assistir: uma pessoa no wizard, duas na "Noite a dois". */
  respostas: Clima[];
  /** Gêneros evitados do perfil (absolutos). */
  evitados: number[];
  /** Exclusões fixas das experiências; perdem para o gênero do tom. */
  semDasExperiencias?: number[];
  /** Outros limites de duração ("Muito longo", "Até que horas?"). */
  limites?: (number | null | undefined)[];
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
}: Montagem): FiltrosNoite {
  const humores = respostas.map(({ humor }) => AJUSTES_HUMOR[humor]);
  const companhias = respostas.map(({ companhia }) => AJUSTES_COMPANHIA[companhia]);
  const semDoTom = [...semDasExperiencias, ...humores.flatMap((h) => h.sem ?? [])].filter(
    (g) => !tom.generos.includes(g),
  );
  const semGeneros = [...new Set([...evitados, ...semDoTom])];
  const duracoes = [...humores.map((h) => h.duracaoMax), ...limites].filter(
    (n) => typeof n === "number",
  );
  const lancadoAte = humores.find((h) => h.lancadoAte)?.lancadoAte;
  const classificacaoMax = companhias.find((c) => c.classificacaoMax)?.classificacaoMax;
  const ordem =
    humores.find((h) => h.ordem)?.ordem ?? companhias.find((c) => c.ordem)?.ordem ?? ORDEM_PADRAO;

  return {
    tom,
    filtros: {
      todosGeneros: tom.generos,
      ...(semGeneros.length > 0 && { semGeneros }),
      ...(duracoes.length > 0 && { duracaoMax: Math.min(...duracoes) }),
      ...(lancadoAte && { lancadoAte }),
      ...(classificacaoMax && { classificacaoMax }),
      notaMin: PISO.notaMin,
      votosMin: PISO.votosMin,
      ordem,
    },
  };
}

/** O tom não tem gênero evitado. */
export function tomPermitido(tom: Tom, evitados: number[]): boolean {
  return !tom.generos.some((g) => evitados.includes(g));
}

/**
 * Filtros do TMDB para a rodada (tabelas de `SPEC/2026-11-18-wizard-noite.md`).
 * A experiência escolhe o tom; o humor e a companhia ajustam; os gêneros evitados do perfil
 * são absolutos, e os favoritos não entram. `null` se todos os tons tiverem gênero evitado.
 */
export function filtrosDaNoite(rodada: RodadaNoite, evitados: number[]): FiltrosNoite | null {
  const { respostas, tom, duracaoMax, tempo } = rodada;
  const experiencia = TONS[respostas.experiencia];
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
  });
}
