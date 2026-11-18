import type { Clima, Pergunta } from "@/features/metricas/eventos";
import type { MotivoTroca } from "@/features/noite/estado";

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
