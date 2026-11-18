import type { Database } from "@/lib/supabase/database.types";

/** Tempo entre a escolha e a pergunta: o de ver um filme (SPEC/2026-11-18-como-foi.md). */
export const ESPERA_PERGUNTA = 3 * 60 * 60 * 1000;

/** Exibições mais próximas que isto contam como a mesma visita. */
export const JANELA_VISITA = 60 * 60 * 1000;

/** A pergunta aparece numa visita e, se ficar sem resposta, em mais uma. */
export const MAX_PERGUNTAS = 2;

type Linha = Database["public"]["Tables"]["escolhas_noite"]["Row"];

export type ControleEscolha = Pick<
  Linha,
  "escolhido_em" | "perguntado_em" | "vezes_perguntado" | "respondido_em"
>;

function desde(instante: string, agora: Date) {
  return agora.getTime() - new Date(instante).getTime();
}

/** A exibição de agora é de uma visita nova (e por isso gasta uma pergunta)? */
export function visitaNova(escolha: ControleEscolha, agora: Date): boolean {
  return escolha.perguntado_em === null || desde(escolha.perguntado_em, agora) >= JANELA_VISITA;
}

/**
 * Deve mostrar "Como foi?" para esta escolha agora? Não antes da espera, nunca depois de
 * respondida, e só enquanto restam perguntas (ou durante a visita que gastou a última).
 */
export function devePerguntar(escolha: ControleEscolha, agora: Date): boolean {
  if (escolha.respondido_em !== null) return false;
  if (desde(escolha.escolhido_em, agora) < ESPERA_PERGUNTA) return false;
  return escolha.vezes_perguntado < MAX_PERGUNTAS || !visitaNova(escolha, agora);
}
