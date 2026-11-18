"use server";

import { climaSchema } from "@/features/metricas/eventos";
import { registrarClima, registrarEvento } from "@/features/metricas/registrar";
import { createClient } from "@/lib/supabase/server";

/**
 * Chamada uma vez pelo navegador quando a primeira recomendação aparece: registra
 * `wizard_concluido` e conta as respostas na contagem anônima de climas
 * (SPEC/2026-11-18-metricas.md). As respostas nunca entram no evento.
 */
export async function concluirNoite(respostas: unknown): Promise<void> {
  const clima = climaSchema.safeParse(respostas);
  if (!clima.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await Promise.all([
    registrarEvento(supabase, { nome: "wizard_concluido" }),
    registrarClima(supabase, clima.data),
  ]);
}
