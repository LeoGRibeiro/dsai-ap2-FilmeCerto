import type { Metadata } from "next";

import type { Compartilhado } from "@/features/compartilhado/titulo";
import { tituloComAno } from "@/features/filme/formatar";
import { urlImagem } from "@/lib/tmdb/imagens";

/** Até onde vai a sinopse da página pública e da prévia do link. */
export const LIMITE_SINOPSE = 280;

/** Título da página de um +18: sem usuário não há filtro, então nada do título aparece. */
export const TITULO_ADULTO = "Título para maiores de 18 anos";

/** Se a página pública esconde o título (SPEC/2026-11-25-compartilhar-publico.md). */
export function eAdulto({ titulo }: Compartilhado): boolean {
  return titulo.classificacao === "18";
}

/** Corta a sinopse no fim da última palavra inteira que cabe, com "…"; texto curto fica igual. */
export function sinopseCurta(texto: string, limite = LIMITE_SINOPSE): string {
  const limpo = texto.trim();
  if (limpo.length <= limite) return limpo;
  const corte = limpo.slice(0, limite);
  const espaco = corte.lastIndexOf(" ");
  return `${(espaco > 0 ? corte.slice(0, espaco) : corte).replace(/[\s.,;:!?…-]+$/, "")}…`;
}

const TIPO_OG = { filme: "video.movie", serie: "video.tv_show" } as const;

/**
 * Título, descrição e Open Graph da página pública, para a prévia do link (WhatsApp e afins)
 * mostrar o filme. A imagem é o pôster do TMDB, em URL absoluta: não depende de `metadataBase`.
 */
export function metadadosCompartilhado(compartilhado: Compartilhado | null): Metadata {
  if (!compartilhado) return { title: "Título não encontrado" };
  const robots = { index: false, follow: false };
  if (eAdulto(compartilhado)) return { title: TITULO_ADULTO, robots };

  const { tipo, titulo } = compartilhado;
  const nome = tituloComAno(titulo);
  const descricao = sinopseCurta(titulo.sinopse) || `Onde assistir ${titulo.titulo} no Brasil.`;
  const poster = urlImagem(titulo.posterPath, "w500");

  return {
    title: nome,
    description: descricao,
    robots,
    openGraph: {
      title: nome,
      description: descricao,
      siteName: "Filme Certo",
      locale: "pt_BR",
      type: TIPO_OG[tipo],
      ...(poster && { images: [{ url: poster, width: 500, height: 750, alt: titulo.titulo }] }),
    },
  };
}
