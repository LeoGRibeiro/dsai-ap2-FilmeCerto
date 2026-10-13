import { vi } from "vitest";

import type { ContextoTool, DadosUsuario } from "@/features/mcp/contexto";
import type { FilmeDetalhes, FilmeResumo } from "@/lib/tmdb/tipos";

export const ORIGEM = "https://filme.test";

export function resumo(id: number, extra: Partial<FilmeResumo> = {}): FilmeResumo {
  return { id, titulo: `Filme ${id}`, tituloOriginal: `Film ${id}`, sinopse: "Sinopse.", posterPath: null,
    backdropPath: null, generos: [18], ano: 2001, nota: 7.25, votos: 100, popularidade: 10, ...extra };
}

export function detalhes(id: number, extra: Partial<FilmeDetalhes> = {}): FilmeDetalhes {
  return { ...resumo(id), generos: [{ id: 18, nome: "Drama" }], duracaoMin: 120, slogan: null,
    trailerYoutube: null, elenco: [1, 2, 3, 4, 5, 6].map((n) => ({ nome: `Ator ${n}`, personagem: "", fotoPath: null })),
    direcao: ["Diretora"], parecidos: [],
    ondeAssistir: { link: "x", assinatura: [{ id: 8, nome: "Netflix", logoPath: null }], aluguel: [], compra: [{ id: 2, nome: "Apple TV", logoPath: null }] },
    ...extra };
}

export function dadosFalsos(sobrescrever: Partial<DadosUsuario> = {}): DadosUsuario {
  return {
    preferencias: vi.fn(async () => ({ generos: [18], generosEvitados: [], duracao: "media" as const, frequencia: "semanal" as const, streamings: [8] })),
    reacoes: vi.fn(async () => []),
    itensLista: vi.fn(async () => []),
    idsNasListas: vi.fn(async () => []),
    estadoFilme: vi.fn(async () => ({ lista: null, reacao: null })),
    definirLista: vi.fn(),
    definirReacao: vi.fn(),
    ...sobrescrever,
  };
}

export function contexto(sobrescrever: Partial<ContextoTool> = {}): ContextoTool {
  return {
    usuarioId: "u-1",
    origem: ORIGEM,
    dados: dadosFalsos(),
    tmdb: {
      buscarFilmes: vi.fn(async () => ({ itens: [resumo(1)], pagina: 1, totalPaginas: 1, totalResultados: 1 })),
      obterFilme: vi.fn(async (id: number) => detalhes(id)),
    },
    motor: {
      descobrirFilmes: vi.fn(async () => ({ itens: [resumo(1), resumo(2)], pagina: 1, totalPaginas: 1, totalResultados: 2 })),
      recomendacoesDe: vi.fn(async () => ({ itens: [], pagina: 1, totalPaginas: 0, totalResultados: 0 })),
    },
    agora: () => new Date("2026-10-13T12:00:00-03:00"),
    ...sobrescrever,
  };
}
