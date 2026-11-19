import {
  MAX_TROCAS,
  type ETAPAS_WIZARD,
  type MOTIVOS_TROCA,
  type NomeEvento,
  type OrigemTrailer,
  type Pergunta,
  type RESPOSTAS_COMO_FOI,
} from "@/features/metricas/eventos";
import { ROTULOS_REACAO } from "@/features/reacoes/opcoes";

/** Ordem e descrição dos eventos na página de métricas. */
export const ROTULOS_EVENTO: Record<NomeEvento, string> = {
  wizard_iniciado: "Abriu o wizard",
  wizard_concluido: "Chegou à recomendação",
  wizard_troca: "Pediu outra sugestão",
  wizard_escolheu: "Clicou “Vou ver esse!”",
  wizard_abandonado: "Saiu sem escolher",
  como_foi_exibido: "Viu o “Como foi?”",
  como_foi_respondido: "Respondeu o “Como foi?”",
  trailer_aberto: "Abriu um trailer",
};

export const ROTULOS_PERGUNTA: Record<Pergunta, string> = {
  humor: "Como está se sentindo",
  experiencia: "Que experiência quer",
  companhia: "Com quem vai assistir",
};

/** Rótulo de cada resposta do wizard, pelo slug gravado (pedido do cliente, 3.2). */
export const ROTULOS_CLIMA: Record<string, string> = {
  cansado: "Cansado",
  animado: "Animado",
  "pra-baixo": "Pra baixo",
  nostalgico: "Nostálgico",
  ansioso: "Ansioso",
  "de-boa": "De boa",
  rir: "Rir",
  emocionar: "Me emocionar",
  susto: "Levar susto",
  tenso: "Ficar tenso",
  pensar: "Pensar",
  distrair: "Só me distrair",
  sozinho: "Sozinho",
  "a-dois": "A dois",
  familia: "Família com crianças",
  amigos: "Amigos",
};

/** Motivos do "Esse não" (pedido do cliente, 3.2). */
export const ROTULOS_MOTIVO: Record<(typeof MOTIVOS_TROCA)[number], string> = {
  "ja-vi": "Já vi",
  "nao-e-o-clima": "Não é o clima",
  "muito-longo": "Muito longo",
  outro: "Outro",
};

/** Trocas antes do "Vou ver esse!", pelo valor gravado ("0" a "5"). */
export const ROTULOS_TROCAS: Record<string, string> = Object.fromEntries(
  Array.from({ length: MAX_TROCAS + 1 }, (_, n) => [
    String(n),
    n === 0 ? "De primeira" : `Depois de ${n} ${n === 1 ? "troca" : "trocas"}`,
  ]),
);

/** Onde a pessoa estava ao sair do wizard sem escolher. */
export const ROTULOS_ETAPA: Record<(typeof ETAPAS_WIZARD)[number], string> = {
  perguntas: "Nas perguntas",
  resultado: "No resultado",
};

/** Respostas do "Como foi?", com os rótulos e a ordem do cartão do dashboard. */
export const ROTULOS_COMO_FOI: Record<(typeof RESPOSTAS_COMO_FOI)[number], string> = {
  amei: ROTULOS_REACAO.amei,
  gostei: ROTULOS_REACAO.gostei,
  "nao-gostei": ROTULOS_REACAO["nao-gostei"],
  "nao-vi": "Não cheguei a ver",
};

export const ROTULOS_ORIGEM: Record<OrigemTrailer, string> = {
  filme: "Página do filme",
  noite: "Wizard da noite",
};
