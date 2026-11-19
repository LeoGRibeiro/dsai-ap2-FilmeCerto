import type { Database } from "@/lib/supabase/database.types";

export type TipoMidia = Database["public"]["Enums"]["tipo_midia"];

export const TIPOS_MIDIA = ["filme", "serie"] as const satisfies TipoMidia[];

/**
 * Um título do TMDB. Só o ID não basta: filme e série têm sequências de ID independentes,
 * então o mesmo número pode ser os dois (pedido do cliente, 3.5).
 */
export type Midia = { tipo: TipoMidia; tmdbId: number };

/** Um número sozinho é filme, como na AP1: quem só lida com filmes continua passando o ID. */
export function lerMidia(alvo: number | Midia): Midia {
  return typeof alvo === "number" ? { tipo: "filme", tmdbId: alvo } : alvo;
}

/** Página de detalhes de cada tipo. */
export function caminhoMidia({ tipo, tmdbId }: Midia): string {
  return `/${tipo}/${tmdbId}`;
}
