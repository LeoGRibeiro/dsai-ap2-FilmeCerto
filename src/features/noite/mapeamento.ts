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

/** Tons de cada experiência, em ordem ("Não é o clima" passa ao seguinte), e exclusões fixas. */
export const TONS: Record<Experiencia, { tons: Tom[]; sem?: number[] }> = {
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

type AjusteHumor = {
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

export const AJUSTES_COMPANHIA: Record<
  Companhia,
  { classificacaoMax?: ClassificacaoBR; ordem?: OrdemDescoberta }
> = {
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
