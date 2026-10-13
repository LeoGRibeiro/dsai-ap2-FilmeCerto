import type { z } from "zod";

import type { ItemLista } from "@/features/listas/consultas";
import type { ResultadoDefinir } from "@/features/listas/gravar";
import type { StatusLista } from "@/features/listas/opcoes";
import type { PreferenciasInput } from "@/features/preferencias/schema";
import type { Reacao } from "@/features/reacoes/opcoes";
import type { ApiMotor } from "@/features/recomendacao/gerar";
import type { ReacaoMotor } from "@/features/recomendacao/tipos";
import type { ApiFilmes } from "@/lib/tmdb/filmes";

/** Acesso aos dados do usuário autenticado; as tools não conhecem o Supabase. */
export type DadosUsuario = {
  preferencias(): Promise<PreferenciasInput | null>;
  reacoes(): Promise<ReacaoMotor[]>;
  itensLista(): Promise<ItemLista[]>;
  idsNasListas(): Promise<number[]>;
  estadoFilme(tmdbId: number): Promise<{ lista: StatusLista | null; reacao: Reacao | null }>;
  definirLista(tmdbId: number, status: StatusLista | null): Promise<ResultadoDefinir<StatusLista>>;
  definirReacao(tmdbId: number, reacao: Reacao | null): Promise<ResultadoDefinir<Reacao>>;
};

export type ContextoTool = {
  usuarioId: string;
  origem: string; // ex.: "https://dsai-ap1-filme-certo.vercel.app"
  dados: DadosUsuario;
  tmdb: Pick<ApiFilmes, "buscarFilmes" | "obterFilme">;
  motor: ApiMotor;
  agora: () => Date;
};

export type ResultadoTool = { content: { type: "text"; text: string }[]; isError?: true };

export type DefinicaoTool<S extends z.ZodType> = {
  nome: string;
  titulo: string;
  descricao: string;
  entrada: S;
  anotacoes: {
    readOnlyHint?: boolean;
    idempotentHint?: boolean;
    destructiveHint?: boolean;
    openWorldHint?: boolean;
  };
  executar(args: z.infer<S>, ctx: ContextoTool): Promise<ResultadoTool>;
};
