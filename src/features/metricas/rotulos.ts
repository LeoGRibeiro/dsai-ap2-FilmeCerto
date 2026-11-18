import type { NomeEvento, Pergunta } from "@/features/metricas/eventos";

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
