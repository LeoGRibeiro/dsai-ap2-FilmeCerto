import { z } from "zod";

import { tmdbIdSchema } from "@/features/reacoes/schema";

export const acompanhamentoSerieSchema = z.object({
  tmdbId: tmdbIdSchema,
  acompanhar: z.boolean(),
});
