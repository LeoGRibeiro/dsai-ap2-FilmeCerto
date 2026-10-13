import type { ResultadoTool } from "@/features/mcp/contexto";
import { GENEROS } from "@/features/preferencias/generos";
import type { FilmeResumo } from "@/lib/tmdb/tipos";

const NOME_GENERO = new Map<number, string>(GENEROS.map((g) => [g.id, g.nome]));
export const MAX_SINOPSE_CURTA = 200;

export const MSG = {
  tmdb: "O catálogo de filmes (TMDB) não respondeu agora. Tente de novo em instantes.",
  banco: "Não foi possível acessar sua conta no Filme Certo agora. Tente de novo.",
  naoEncontrado: "Filme não encontrado.",
  semPreferencias: (origem: string) =>
    `Conte seus gostos ao Filme Certo primeiro: ${origem}/onboarding`,
};

export function ok(dados: unknown): ResultadoTool {
  return { content: [{ type: "text", text: JSON.stringify(dados) }] };
}

export function erro(mensagem: string): ResultadoTool {
  return { content: [{ type: "text", text: mensagem }], isError: true };
}

export function nomesGeneros(ids: number[]): string[] {
  return ids.flatMap((id) => NOME_GENERO.get(id) ?? []);
}

export function encurtar(texto: string, max = MAX_SINOPSE_CURTA): string {
  const limpo = texto.trim();
  return limpo.length <= max ? limpo : `${limpo.slice(0, max - 1).trimEnd()}…`;
}

export function linkFilme(origem: string, id: number): string {
  return `${origem}/filme/${id}`;
}

export function resumoFilme(filme: FilmeResumo, origem: string) {
  return {
    tmdb_id: filme.id,
    titulo: filme.titulo,
    ano: filme.ano,
    generos: nomesGeneros(filme.generos),
    nota: Math.round(filme.nota * 10) / 10,
    link: linkFilme(origem, filme.id),
  };
}
