import {
  CLASSIFICACAO_FAMILIA,
  type AjusteHumor,
  type Mapeamento,
} from "@/features/noite/mapeamento";
import type { Humor } from "@/features/noite/opcoes";

/**
 * Tabelas de mapeamento das respostas para os filtros do `/discover/tv`.
 * Espelham as tabelas de `SPEC/2026-11-18-series-noite.md`, que o cliente revisa.
 */

/** IDs de gênero de TV do TMDB (`/genre/tv/list`): outra lista que a dos filmes. */
const TV = {
  acaoAventura: 10759,
  animacao: 16,
  comedia: 35,
  crime: 80,
  documentario: 99,
  drama: 18,
  familia: 10751,
  kids: 10762,
  misterio: 9648,
  news: 10763,
  reality: 10764,
  ficcaoFantasia: 10765,
  talk: 10767,
  guerraPolitica: 10768,
} as const;

/** Terror (gênero de filme): não existe para séries. */
const TERROR_FILME = 27;

const PESADOS = [TV.crime, TV.misterio, TV.guerraPolitica];

const HUMOR: Record<Humor, AjusteHumor> = {
  cansado: { duracaoMax: 45, ordem: "popularidade" },
  animado: {},
  "pra-baixo": { sem: PESADOS },
  nostalgico: { lancadoAte: "2005-12-31" },
  ansioso: { sem: PESADOS },
  "de-boa": {},
};

/**
 * Gêneros de filme evitados no perfil → gêneros de TV. Os que faltam aqui e não têm o mesmo
 * ID em TV (Terror, Thriller, Romance, História, Música, Cinema TV) não têm equivalente.
 */
const EVITADOS_EM_TV: Record<number, number> = {
  28: TV.acaoAventura,
  12: TV.acaoAventura,
  878: TV.ficcaoFantasia,
  14: TV.ficcaoFantasia,
  10752: TV.guerraPolitica,
};
const MESMO_ID = new Set<number>([16, 35, 80, 99, 18, 10751, 37, 9648]);

function evitadosEmTv(generosDeFilme: readonly number[]): number[] {
  const tv = generosDeFilme.flatMap((id) => {
    const equivalente = EVITADOS_EM_TV[id] ?? (MESMO_ID.has(id) ? id : undefined);
    return equivalente === undefined ? [] : [equivalente];
  });
  return [...new Set(tv)];
}

export const MAPEAMENTO_SERIE: Mapeamento = {
  tons: {
    rir: {
      tons: [
        { nome: "comédia", generos: [TV.comedia] },
        { nome: "comédia animada", generos: [TV.animacao, TV.comedia] },
        { nome: "comédia dramática", generos: [TV.comedia, TV.drama] },
      ],
      sem: [TV.crime, TV.misterio, TV.guerraPolitica],
    },
    emocionar: {
      tons: [
        { nome: "drama", generos: [TV.drama] },
        { nome: "drama de família", generos: [TV.drama, TV.familia] },
        { nome: "drama de guerra e política", generos: [TV.drama, TV.guerraPolitica] },
      ],
    },
    susto: {
      tons: [
        { nome: "mistério sobrenatural", generos: [TV.misterio, TV.ficcaoFantasia] },
        { nome: "fantasia sombria", generos: [TV.ficcaoFantasia, TV.drama] },
        { nome: "mistério sombrio", generos: [TV.misterio, TV.drama] },
      ],
      sem: [TV.comedia, TV.familia, TV.kids],
      evitadaSe: [TERROR_FILME],
    },
    tenso: {
      tons: [
        { nome: "policial", generos: [TV.crime] },
        { nome: "investigação", generos: [TV.crime, TV.misterio] },
        { nome: "suspense político", generos: [TV.guerraPolitica, TV.drama] },
      ],
      sem: [TV.comedia],
    },
    pensar: {
      tons: [
        { nome: "ficção científica", generos: [TV.ficcaoFantasia] },
        { nome: "mistério", generos: [TV.misterio, TV.drama] },
        { nome: "documentário", generos: [TV.documentario] },
      ],
      sem: [TV.kids],
    },
    distrair: {
      tons: [
        { nome: "aventura", generos: [TV.acaoAventura] },
        { nome: "animação", generos: [TV.animacao] },
        { nome: "comédia", generos: [TV.comedia] },
      ],
      sem: [TV.guerraPolitica],
    },
  },
  humor: HUMOR,
  companhia: {
    sozinho: {},
    "a-dois": {},
    familia: { classificacaoMax: CLASSIFICACAO_FAMILIA },
    amigos: { ordem: "popularidade" },
  },
  // Para ver um episódio, não um telejornal, um reality ou um programa de entrevistas.
  sempreSem: [TV.news, TV.reality, TV.talk],
  // O /discover/tv não filtra por classificação: ela é conferida série a série.
  classificacaoNoTmdb: false,
  duracaoTroca: { reducao: 15, minima: 20, base: 60 },
  tempoMinimo: 20,
  evitados: evitadosEmTv,
};
