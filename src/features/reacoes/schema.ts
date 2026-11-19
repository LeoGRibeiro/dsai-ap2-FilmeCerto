import { z } from "zod";

import { REACOES } from "@/features/reacoes/opcoes";
import { TIPOS_MIDIA } from "@/lib/midia";

export const tmdbIdSchema = z.number().int().positive();

/** Formulários sem `tipo` (os da AP1) são de filme. */
export const tipoMidiaSchema = z.enum(TIPOS_MIDIA).default("filme");

export const reacaoSchema = z.object({
  tipo: tipoMidiaSchema,
  tmdbId: tmdbIdSchema,
  reacao: z.enum(REACOES),
});
