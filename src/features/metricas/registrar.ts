import "server-only";

import { climaSchema, eventoSchema, type Clima, type Evento } from "@/features/metricas/eventos";
import type { ClienteSupabase } from "@/lib/supabase/token";

type RespostaBanco = { error: { code: string; message: string } | null };

/** Executa a escrita e transforma qualquer falha em `false` com log. */
async function semLancar(acao: string, escrever: () => PromiseLike<RespostaBanco>) {
  try {
    const { error } = await escrever();
    if (!error) return true;
    console.error(`[metricas] falha ao ${acao}:`, error.code, error.message);
  } catch (erro) {
    console.error(`[metricas] falha ao ${acao}:`, erro);
  }
  return false;
}

/**
 * Registra um evento de uso do usuário logado (o `usuario_id` vem do banco, por `auth.uid()`).
 * Nunca lança: métrica não pode quebrar a tela. Devolve se gravou.
 */
export async function registrarEvento(supabase: ClienteSupabase, evento: Evento): Promise<boolean> {
  const valido = eventoSchema.safeParse(evento);
  if (!valido.success) {
    console.error("[metricas] evento inválido:", evento.nome);
    return false;
  }
  const { nome, dados } = valido.data;
  return semLancar("registrar", () => supabase.from("eventos").insert({ nome, dados }));
}

/** Conta as respostas do wizard sem vínculo com a pessoa. Nunca lança. */
export async function registrarClima(supabase: ClienteSupabase, clima: Clima): Promise<boolean> {
  const valido = climaSchema.safeParse(clima);
  if (!valido.success) {
    console.error("[metricas] clima inválido");
    return false;
  }
  const { humor, experiencia, companhia } = valido.data;
  return semLancar("contar clima", () =>
    supabase.rpc("registrar_clima", {
      p_humor: humor,
      p_experiencia: experiencia,
      p_companhia: companhia,
    }),
  );
}
