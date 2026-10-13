import "server-only";

import { idsNasListas, obterItensLista, obterStatusLista } from "@/features/listas/consultas";
import { definirLista } from "@/features/listas/gravar";
import type { DadosUsuario } from "@/features/mcp/contexto";
import { obterPreferencias } from "@/features/preferencias/consultas";
import { obterReacao, obterReacoes } from "@/features/reacoes/consultas";
import { definirReacao } from "@/features/reacoes/gravar";
import type { ClienteSupabase } from "@/lib/supabase/token";

/** Dados do usuário dono do token; toda leitura e escrita passa pela RLS. */
export function criarDados(supabase: ClienteSupabase, usuarioId: string): DadosUsuario {
  return {
    preferencias: () => obterPreferencias(supabase),
    reacoes: () => obterReacoes(supabase),
    itensLista: () => obterItensLista(supabase),
    idsNasListas: () => idsNasListas(supabase),
    async estadoFilme(tmdbId) {
      const [lista, reacao] = await Promise.all([
        obterStatusLista(tmdbId, supabase),
        obterReacao(tmdbId, supabase),
      ]);
      return { lista, reacao };
    },
    definirLista: (tmdbId, status) => definirLista(supabase, usuarioId, tmdbId, status),
    definirReacao: (tmdbId, reacao) => definirReacao(supabase, usuarioId, tmdbId, reacao),
  };
}
