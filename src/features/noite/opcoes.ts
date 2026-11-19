import type { Clima, Pergunta } from "@/features/metricas/eventos";
import type { MotivoTroca } from "@/features/noite/estado";
import type { TipoMidia } from "@/lib/midia";

export type Humor = Clima["humor"];
export type Experiencia = Clima["experiencia"];
export type Companhia = Clima["companhia"];

/**
 * As telas do wizard, na ordem, com o parâmetro de cada resposta na URL.
 * Os rótulos das respostas estão em `ROTULOS_CLIMA` (`src/features/metricas/rotulos.ts`).
 */
export const PERGUNTAS = [
  { chave: "humor", parametro: "humor", titulo: "Como você está se sentindo?" },
  { chave: "experiencia", parametro: "exp", titulo: "Que tipo de experiência você quer?" },
  { chave: "companhia", parametro: "com", titulo: "Com quem vai assistir?" },
] as const satisfies { chave: Pergunta; parametro: string; titulo: string }[];

/** Cartões do "Filme ou série?" (SPEC/2026-11-18-series-noite.md). */
export const ROTULOS_TIPO: Record<TipoMidia, string> = { filme: "Filme", serie: "Série" };

/** Horários do "Até que horas?" (SPEC/2026-11-18-noite-ate-que-horas.md): meia-noite é 0. */
export const HORAS_LIMITE = [22, 23, 0, 1] as const;
export type HoraLimite = (typeof HORAS_LIMITE)[number];

/** Rótulo de cada botão do "Até que horas?". */
export const ROTULOS_HORA: Record<HoraLimite, string> = {
  22: "22h",
  23: "23h",
  0: "Meia-noite",
  1: "1h",
};

/** "Não dá tempo de ver um filme até as 23h". */
export const ATE_A_HORA: Record<HoraLimite, string> = {
  22: "até as 22h",
  23: "até as 23h",
  0: "até a meia-noite",
  1: "até a 1h",
};

/** Motivos de "Esse não", na ordem do pedido do cliente (3.2). */
export const ROTULOS_MOTIVO: Record<MotivoTroca, string> = {
  "ja-vi": "Já vi",
  "nao-e-o-clima": "Não é o clima",
  "muito-longo": "Muito longo",
  outro: "Outro",
};

/** Trechos do motivo: "Você está cansado, quer rir e vai ver a dois". */
export const TRECHOS: { [P in Pergunta]: Record<Clima[P], string> } = {
  humor: {
    cansado: "Você está cansado",
    animado: "Você está animado",
    "pra-baixo": "Você está pra baixo",
    nostalgico: "Você está nostálgico",
    ansioso: "Você está ansioso",
    "de-boa": "Você está de boa",
  },
  experiencia: {
    rir: "quer rir",
    emocionar: "quer se emocionar",
    susto: "quer levar um susto",
    tenso: "quer ficar tenso",
    pensar: "quer pensar",
    distrair: "quer só se distrair",
  },
  companhia: {
    sozinho: "vai ver sozinho",
    "a-dois": "vai ver a dois",
    familia: "vai ver com as crianças",
    amigos: "vai ver com os amigos",
  },
};
