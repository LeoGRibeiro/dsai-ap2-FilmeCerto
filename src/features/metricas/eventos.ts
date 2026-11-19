import { z } from "zod";

/** Limite de trocas do wizard (pedido do cliente, 3.2). */
export const MAX_TROCAS = 5;

export const MOTIVOS_TROCA = ["ja-vi", "nao-e-o-clima", "muito-longo", "outro"] as const;
export const RESPOSTAS_COMO_FOI = ["amei", "gostei", "nao-gostei", "nao-vi"] as const;
export const ORIGENS_TRAILER = ["filme", "noite", "serie"] as const;
export const ETAPAS_WIZARD = ["perguntas", "resultado"] as const;

export type OrigemTrailer = (typeof ORIGENS_TRAILER)[number];

const semDados = z.strictObject({}).default({});

/**
 * Lista fechada de eventos e os dados de cada um (SPEC/2026-11-18-metricas.md).
 * Objetos estritos: qualquer chave a mais, como o clima do wizard, é recusada.
 */
export const eventoSchema = z.discriminatedUnion("nome", [
  z.object({ nome: z.literal("wizard_iniciado"), dados: semDados }),
  z.object({ nome: z.literal("wizard_concluido"), dados: semDados }),
  z.object({
    nome: z.literal("wizard_troca"),
    dados: z.strictObject({ motivo: z.enum(MOTIVOS_TROCA) }),
  }),
  z.object({
    nome: z.literal("wizard_escolheu"),
    dados: z.strictObject({ trocas: z.number().int().min(0).max(MAX_TROCAS) }),
  }),
  z.object({
    nome: z.literal("wizard_abandonado"),
    dados: z.strictObject({ etapa: z.enum(ETAPAS_WIZARD) }),
  }),
  z.object({ nome: z.literal("como_foi_exibido"), dados: semDados }),
  z.object({
    nome: z.literal("como_foi_respondido"),
    dados: z.strictObject({ resposta: z.enum(RESPOSTAS_COMO_FOI) }),
  }),
  z.object({
    nome: z.literal("trailer_aberto"),
    dados: z.strictObject({ origem: z.enum(ORIGENS_TRAILER) }),
  }),
]);

/** Evento como quem registra escreve (`dados` pode faltar nos eventos sem dados). */
export type Evento = z.input<typeof eventoSchema>;
export type NomeEvento = Evento["nome"];

/** Respostas do wizard contadas sem vínculo com a pessoa. */
export const CLIMAS = {
  humor: ["cansado", "animado", "pra-baixo", "nostalgico", "ansioso", "de-boa"],
  experiencia: ["rir", "emocionar", "susto", "tenso", "pensar", "distrair"],
  companhia: ["sozinho", "a-dois", "familia", "amigos"],
} as const;

export type Pergunta = keyof typeof CLIMAS;

export const climaSchema = z.object({
  humor: z.enum(CLIMAS.humor),
  experiencia: z.enum(CLIMAS.experiencia),
  companhia: z.enum(CLIMAS.companhia),
});

export type Clima = z.infer<typeof climaSchema>;
