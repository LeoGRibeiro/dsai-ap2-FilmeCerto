import { z } from "zod";

import { STATUS_LISTA } from "@/features/listas/opcoes";
import { tipoMidiaSchema, tmdbIdSchema } from "@/features/reacoes/schema";

export const listaSchema = z.object({
  tipo: tipoMidiaSchema,
  tmdbId: tmdbIdSchema,
  status: z.enum(STATUS_LISTA),
});
