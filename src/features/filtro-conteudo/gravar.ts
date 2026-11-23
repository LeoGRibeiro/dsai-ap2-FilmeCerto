import { z } from "zod";

import { LIMITES, SEM_FILTRO, type FiltroConteudo } from "@/features/filtro-conteudo/opcoes";
import type { ClienteSupabase } from "@/lib/supabase/token";

/** O valor do formulário: "sem" vira `null` (Sem filtro); os outros, o limite. */
export const escolhaFiltroSchema = z
  .enum([SEM_FILTRO, ...LIMITES], { message: "Escolha uma das opções do filtro." })
  .transform((valor): FiltroConteudo => (valor === SEM_FILTRO ? null : valor));

/** Grava a escolha: "Sem filtro" apaga a linha; as outras gravam o limite. */
export async function gravarFiltro(
  supabase: ClienteSupabase,
  usuarioId: string,
  filtro: FiltroConteudo,
): Promise<"ok" | "erro"> {
  const tabela = supabase.from("filtros_conteudo");
  const { error } = filtro
    ? await tabela.upsert({ usuario_id: usuarioId, limite: filtro })
    : await tabela.delete().eq("usuario_id", usuarioId);
  if (error) {
    console.error("[filtro-conteudo] falha ao salvar:", error.code, error.message);
    return "erro";
  }
  return "ok";
}
