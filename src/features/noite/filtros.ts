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
};

export type FiltrosNoite = { filtros: FiltrosDescoberta; tom: Tom };

/**
 * Filtros do TMDB para a rodada (tabelas de `SPEC/2026-11-18-wizard-noite.md`).
 * A experiência escolhe o tom; o humor e a companhia ajustam; os gêneros evitados do perfil
 * são absolutos, e os favoritos não entram. `null` se todos os tons tiverem gênero evitado.
 */
export function filtrosDaNoite(rodada: RodadaNoite, evitados: number[]): FiltrosNoite | null {
  const { respostas, tom, duracaoMax } = rodada;
  const experiencia = TONS[respostas.experiencia];
  const disponiveis = experiencia.tons.filter((t) => !t.generos.some((g) => evitados.includes(g)));
  const escolhido = disponiveis[tom % disponiveis.length];
  if (!escolhido) return null;

  const humor = AJUSTES_HUMOR[respostas.humor];
  const companhia = AJUSTES_COMPANHIA[respostas.companhia];
  // A experiência manda mais que o humor: o humor não exclui o gênero do tom.
  const semDoHumor = (humor.sem ?? []).filter((g) => !escolhido.generos.includes(g));
  const semGeneros = [...new Set([...evitados, ...(experiencia.sem ?? []), ...semDoHumor])];
  const limites = [humor.duracaoMax, duracaoMax ?? undefined].filter((n) => n !== undefined);

  return {
    tom: escolhido,
    filtros: {
      todosGeneros: escolhido.generos,
      ...(semGeneros.length > 0 && { semGeneros }),
      ...(limites.length > 0 && { duracaoMax: Math.min(...limites) }),
      ...(humor.lancadoAte && { lancadoAte: humor.lancadoAte }),
      ...(companhia.classificacaoMax && { classificacaoMax: companhia.classificacaoMax }),
      notaMin: PISO.notaMin,
      votosMin: PISO.votosMin,
      ordem: humor.ordem ?? companhia.ordem ?? ORDEM_PADRAO,
    },
  };
}
