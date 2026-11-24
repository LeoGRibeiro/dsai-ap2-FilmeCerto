import "server-only";

import { z } from "zod";

import { ehLimite, type FiltroConteudo } from "@/features/filtro-conteudo/opcoes";
import { climaSchema } from "@/features/metricas/eventos";
import { NoiteIndisponivel, recomendarJuntos, type ApiNoite } from "@/features/noite/recomendar";
import type { ClienteSupabase } from "@/lib/supabase/token";

/**
 * A sala da "Noite a dois" no servidor (SPEC/2026-11-18-noite-a-dois.md): o que a tela
 * mostra a cada momento e a montagem da sugestão. O cliente do Supabase é injetado.
 */

export const idSalaSchema = z.uuid();

export const resultadoSalaSchema = z.object({
  filmes: z
    .array(z.object({ id: z.number().int().positive(), motivo: z.string().max(400) }))
    .max(3),
});

export type ResultadoSala = z.infer<typeof resultadoSalaSchema>;
export type Papel = "criador" | "convidado";
export type SalaIndisponivel = "cheia" | "expirada" | "inexistente";

export type TelaSala =
  | { tipo: "indisponivel"; motivo: SalaIndisponivel }
  /** Falta a resposta de quem está vendo. */
  | { tipo: "perguntas"; papel: Papel; convidadoEntrou: boolean }
  /** Quem está vendo já respondeu; falta a outra pessoa. */
  | { tipo: "esperando"; papel: Papel; convidadoEntrou: boolean }
  /** As duas responderam e a sugestão ainda não foi gravada. */
  | { tipo: "montar" }
  | { tipo: "resultado"; resultado: ResultadoSala };

/** Erro do banco que a tela trata com o `error.tsx` ("Tentar de novo"). */
function falhou(acao: string, erro: { code: string; message: string }): never {
  console.error(`[noite-a-dois] falha ao ${acao}:`, erro.code, erro.message);
  throw new Error("Não foi possível abrir a sala agora.");
}

/**
 * Abre a sala pelo link: entra como convidado se a vaga estiver livre e devolve o que a tela
 * deve mostrar. Sala com ID inválido conta como inexistente.
 */
export async function abrirSala(supabase: ClienteSupabase, sala: string): Promise<TelaSala> {
  if (!idSalaSchema.safeParse(sala).success) return { tipo: "indisponivel", motivo: "inexistente" };

  const entrada = await supabase.rpc("entrar_sala_noite", { p_sala: sala });
  if (entrada.error) falhou("entrar na sala", entrada.error);
  const papel = entrada.data;
  if (papel !== "criador" && papel !== "convidado") {
    const motivo = (["cheia", "expirada"] as const).find((m) => m === papel) ?? "inexistente";
    return { tipo: "indisponivel", motivo };
  }

  const { data: linha, error } = await supabase
    .from("salas_noite")
    .select("convidado_id, respostas_criador, respostas_convidado, resultado")
    .eq("id", sala)
    .maybeSingle();
  if (error) falhou("ler a sala", error);
  // Expirou entre a entrada e a leitura.
  if (!linha) return { tipo: "indisponivel", motivo: "expirada" };

  const resultado = resultadoSalaSchema.safeParse(linha.resultado);
  if (linha.resultado !== null && resultado.success) {
    return { tipo: "resultado", resultado: resultado.data };
  }

  const minhas = papel === "criador" ? linha.respostas_criador : linha.respostas_convidado;
  const outras = papel === "criador" ? linha.respostas_convidado : linha.respostas_criador;
  const convidadoEntrou = linha.convidado_id !== null;
  if (minhas === null) return { tipo: "perguntas", papel, convidadoEntrou };
  if (outras === null) return { tipo: "esperando", papel, convidadoEntrou };
  return { tipo: "montar" };
}

export type Montagem = { ok: true } | { ok: false; mensagem: string };

const TMDB_FORA = "Não conseguimos buscar os filmes agora. Tente de novo em instantes.";
const ERRO_BANCO = "Não foi possível montar a sugestão agora. Tente de novo.";

/**
 * Monta e grava a sugestão para as duas pessoas: lê as restrições somadas, roda
 * `recomendarJuntos` e grava o resultado (só a primeira gravação vale). Sem as duas respostas,
 * inclusive porque o resultado já foi gravado e elas foram apagadas, não faz nada.
 */
export async function montarResultado(
  supabase: ClienteSupabase,
  sala: string,
  api: ApiNoite,
): Promise<Montagem> {
  const restricoes = await supabase.rpc("restricoes_sala_noite", { p_sala: sala });
  if (restricoes.error?.code === "P0001") return { ok: true };
  const linha = restricoes.data?.[0];
  if (restricoes.error || !linha) {
    console.error("[noite-a-dois] restrições:", restricoes.error?.code, restricoes.error?.message);
    return { ok: false, mensagem: ERRO_BANCO };
  }

  const a = climaSchema.safeParse(linha.respostas_criador);
  const b = climaSchema.safeParse(linha.respostas_convidado);
  if (!a.success || !b.success) return { ok: false, mensagem: ERRO_BANCO };

  // Vale o filtro por idade mais restrito dos dois. Sem resposta do banco (ou com um limite que
  // não conhecemos), vale o mais seguro: "Até 10 anos".
  const limite = await supabase.rpc("limite_filtro_sala_noite", { p_sala: sala });
  if (limite.error) {
    console.error("[noite-a-dois] filtro:", limite.error.code, limite.error.message);
  }
  const filtro: FiltroConteudo =
    limite.error || (limite.data != null && !ehLimite(limite.data)) ? "10" : (limite.data ?? null);

  let filmes: ResultadoSala["filmes"];
  try {
    const sugestao = await recomendarJuntos({
      a: a.data,
      b: b.data,
      perfil: { generosEvitados: linha.evitados, streamings: linha.streamings, filtro },
      excluir: linha.excluir,
      api,
    });
    filmes = sugestao
      ? [sugestao.destaque, ...sugestao.opcoes].map(({ filme, motivo }) => ({
          id: filme.id,
          motivo,
        }))
      : [];
  } catch (erro) {
    if (erro instanceof NoiteIndisponivel) return { ok: false, mensagem: TMDB_FORA };
    throw erro;
  }

  const conclusao = await supabase.rpc("concluir_sala_noite", {
    p_sala: sala,
    p_resultado: { filmes },
  });
  if (conclusao.error) {
    console.error("[noite-a-dois] concluir:", conclusao.error.code, conclusao.error.message);
    return { ok: false, mensagem: ERRO_BANCO };
  }
  return { ok: true };
}
