import {
  CLASSIFICACAO_FAMILIA,
  type AjusteHumor,
  type Mapeamento,
} from "@/features/noite/mapeamento";
import type { Humor } from "@/features/noite/opcoes";
import { generosEmTv, TV } from "@/features/serie/generos";

/**
 * Tabelas de mapeamento das respostas para os filtros do `/discover/tv`.
 * Espelham as tabelas de `SPEC/2026-11-18-series-noite.md`, que o cliente revisa.
 */

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
  evitados: generosEmTv,
};
