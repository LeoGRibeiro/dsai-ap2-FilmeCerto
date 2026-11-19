import "server-only";

import { devePerguntar } from "@/features/como-foi/regras";
import type { TipoMidia } from "@/lib/midia";
import { createClient } from "@/lib/supabase/server";
import type { ClienteSupabase } from "@/lib/supabase/token";

export type PerguntaComoFoi = { id: number; tipo: TipoMidia; tmdbId: number; titulo: string };

/**
 * A pergunta "Como foi?" a fazer agora, ou `null`. Considera só a escolha mais recente:
 * se ela não deve ser perguntada, as mais antigas também não voltam. Só lê o banco.
 */
export async function obterComoFoi(
  cliente?: ClienteSupabase,
  agora = new Date(),
): Promise<PerguntaComoFoi | null> {
  const supabase = cliente ?? (await createClient());
  const { data, error } = await supabase
    .from("escolhas_noite")
    .select(
      "id, tipo, tmdb_id, titulo, escolhido_em, perguntado_em, vezes_perguntado, respondido_em",
    )
    .order("escolhido_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[como-foi] falha ao ler a escolha:", error.code, error.message);
    return null;
  }
  if (!data || !devePerguntar(data, agora)) return null;
  return { id: data.id, tipo: data.tipo, tmdbId: data.tmdb_id, titulo: data.titulo };
}
