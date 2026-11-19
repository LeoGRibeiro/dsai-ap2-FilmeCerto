import type { Companhia, Experiencia, Humor } from "@/features/noite/opcoes";
import type { ClassificacaoBR, OrdemDescoberta } from "@/lib/tmdb/tipos";

/**
 * Tabelas de mapeamento das respostas para os filtros do TMDB.
 * Espelham as tabelas de `SPEC/2026-11-18-wizard-noite.md`, que o cliente revisa.
 */

/** IDs de gênero de filme do TMDB usados no wizard. */
const G = {
  acao: 28,
  animacao: 16,
  aventura: 12,
  comedia: 35,
  crime: 80,
  drama: 18,
  ficcao: 878,
  guerra: 10752,
  historia: 36,
  misterio: 9648,
  romance: 10749,
  terror: 27,
  thriller: 53,
} as const;

/** Um "tom" da experiência: os gêneros exigidos juntos e o nome que vai no motivo. */
export type Tom = { nome: string; generos: number[] };

/** Os tons de uma experiência, em ordem ("Não é o clima" passa ao seguinte), e exclusões fixas. */
export type TonsDaExperiencia = {
  tons: Tom[];
  sem?: number[];
  /** Gêneros de filme do perfil que, evitados, tiram a experiência inteira (série sem equivalente). */
  evitadaSe?: number[];
};

/** Tons de cada experiência para filmes. */
export const TONS: Record<Experiencia, TonsDaExperiencia> = {
  rir: {
    tons: [
      { nome: "comédia leve", generos: [G.comedia] },
      { nome: "comédia romântica", generos: [G.comedia, G.romance] },
      { nome: "comédia de aventura", generos: [G.comedia, G.aventura] },
    ],
    sem: [G.terror, G.thriller, G.crime, G.guerra],
  },
  emocionar: {
    tons: [
      { nome: "drama", generos: [G.drama] },
      { nome: "romance", generos: [G.romance, G.drama] },
      { nome: "drama de época", generos: [G.drama, G.historia] },
    ],
  },
  susto: {
    tons: [
      { nome: "terror", generos: [G.terror] },
      { nome: "terror de mistério", generos: [G.terror, G.misterio] },
      { nome: "terror de ficção científica", generos: [G.terror, G.ficcao] },
    ],
  },
  tenso: {
    tons: [
      { nome: "suspense", generos: [G.thriller] },
      { nome: "policial", generos: [G.crime, G.thriller] },
      { nome: "mistério", generos: [G.misterio] },
    ],
  },
  pensar: {
    tons: [
      { nome: "ficção científica", generos: [G.ficcao] },
      { nome: "mistério", generos: [G.misterio, G.drama] },
      { nome: "drama para refletir", generos: [G.drama] },
    ],
  },
  distrair: {
    tons: [
      { nome: "aventura", generos: [G.aventura] },
      { nome: "ação", generos: [G.acao] },
      { nome: "animação", generos: [G.animacao] },
    ],
    sem: [G.terror, G.guerra],
  },
};

/** Quantos tons cada experiência tem (o `tom` da URL vai de 0 a TOTAL_TONS - 1). */
export const TOTAL_TONS = 3;

export type AjusteHumor = {
  duracaoMax?: number;
  ordem?: OrdemDescoberta;
  lancadoAte?: string;
  /** Excluídos, salvo se o tom atual pedir o gênero. */
  sem?: number[];
};

const PESADOS = [G.terror, G.thriller, G.guerra];

export const AJUSTES_HUMOR: Record<Humor, AjusteHumor> = {
  cansado: { duracaoMax: 110, ordem: "popularidade" },
  animado: {},
  "pra-baixo": { sem: PESADOS },
  nostalgico: { lancadoAte: "2005-12-31" },
  ansioso: { sem: PESADOS },
  "de-boa": {},
};

/** Classificação máxima em "família com crianças" (proposta da issue #2). */
export const CLASSIFICACAO_FAMILIA: ClassificacaoBR = "12";

export type AjusteCompanhia = { classificacaoMax?: ClassificacaoBR; ordem?: OrdemDescoberta };

export const AJUSTES_COMPANHIA: Record<Companhia, AjusteCompanhia> = {
  sozinho: {},
  "a-dois": {},
  familia: { classificacaoMax: CLASSIFICACAO_FAMILIA },
  amigos: { ordem: "popularidade" },
};

/** Piso de qualidade, sempre aplicado. */
export const PISO = { notaMin: 6.5, votosMin: 300 } as const;

export const ORDEM_PADRAO: OrdemDescoberta = "nota";

/** "Muito longo": quanto encurtar, o mínimo e a base quando a duração é desconhecida. */
export const DURACAO_TROCA = { reducao: 20, minima: 80, base: 120 } as const;

/** "Até que horas?": com menos minutos que isso, não há filme a sugerir. */
export const TEMPO_MINIMO = 60;

/**
 * As tabelas de um tipo de título. Filmes usam as desta página; séries, as de
 * `mapeamento-serie.ts` (SPEC/2026-11-18-series-noite.md).
 */
export type Mapeamento = {
  tons: Record<Experiencia, TonsDaExperiencia>;
  humor: Record<Humor, AjusteHumor>;
  companhia: Record<Companhia, AjusteCompanhia>;
  /** Gêneros excluídos em toda rodada. */
  sempreSem: number[];
  /** `false` quando o TMDB não filtra a classificação e ela é conferida nos detalhes. */
  classificacaoNoTmdb: boolean;
  /** "Muito longo": quanto encurtar, o mínimo e a base quando a duração é desconhecida. */
  duracaoTroca: { reducao: number; minima: number; base: number };
  /** "Até que horas?": com menos minutos que isso, não há o que sugerir. */
  tempoMinimo: number;
  /** Os gêneros evitados do perfil (IDs de filme) nos IDs de gênero deste tipo. */
  evitados: (generosDeFilme: readonly number[]) => number[];
};

export const MAPEAMENTO_FILME: Mapeamento = {
  tons: TONS,
  humor: AJUSTES_HUMOR,
  companhia: AJUSTES_COMPANHIA,
  sempreSem: [],
  classificacaoNoTmdb: true,
  duracaoTroca: DURACAO_TROCA,
  tempoMinimo: TEMPO_MINIMO,
  evitados: (generos) => [...generos],
};
