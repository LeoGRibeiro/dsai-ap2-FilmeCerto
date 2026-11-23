import type { ClassificacaoBR } from "@/lib/tmdb/tipos";

/** Cache (s) da classificação: é a mesma para todo mundo e quase nunca muda. */
export const CACHE_CLASSIFICACAO = 7 * 24 * 3600;

/** Classificações do Brasil, da mais leve à mais restrita. Pode ser usado no navegador. */
export const CLASSIFICACOES_BR: readonly ClassificacaoBR[] = ["L", "10", "12", "14", "16", "18"];

/** Classificação conhecida e até `maxima`; desconhecida (`null`) não passa. */
export function ateAClassificacao(
  classificacao: ClassificacaoBR | null | undefined,
  maxima: ClassificacaoBR,
): boolean {
  return (
    !!classificacao && CLASSIFICACOES_BR.indexOf(classificacao) <= CLASSIFICACOES_BR.indexOf(maxima)
  );
}

/**
 * Equivalências dos EUA, usadas só sem a classificação do Brasil (SPEC/2026-11-23-filtro-idade.md).
 * Uma classificação deduzida só chega a 18 com NC-17: R e TV-MA são 16 em muitos títulos daqui.
 */
export const EQUIVALENCIAS_MPA: Readonly<Record<string, ClassificacaoBR>> = {
  G: "L",
  PG: "10",
  "PG-13": "14",
  R: "16",
  "NC-17": "18",
};

export const EQUIVALENCIAS_TV: Readonly<Record<string, ClassificacaoBR>> = {
  "TV-Y": "L",
  "TV-G": "L",
  "TV-Y7": "10",
  "TV-PG": "10",
  "TV-14": "14",
  "TV-MA": "16",
};

const DO_BRASIL: Readonly<Record<string, ClassificacaoBR>> = Object.fromEntries(
  CLASSIFICACOES_BR.map((classificacao) => [classificacao, classificacao]),
);

/** A mais alta das classificações conhecidas pela tabela; `null` sem nenhuma. */
function maisAlta(valores: string[], tabela: Readonly<Record<string, ClassificacaoBR>>) {
  const conhecidas = valores.flatMap((valor) => tabela[valor.trim()] ?? []);
  if (conhecidas.length === 0) return null;
  return CLASSIFICACOES_BR[Math.max(...conhecidas.map((c) => CLASSIFICACOES_BR.indexOf(c)))]!;
}

/** As classificações de um país, como o TMDB as manda, já separadas por país. */
export type ClassificacoesPorPais = { pais: string; valores: string[] }[];

function deduzir(
  porPais: ClassificacoesPorPais,
  equivalenciasEua: Readonly<Record<string, ClassificacaoBR>>,
): ClassificacaoBR | null {
  const de = (pais: string) => porPais.filter((p) => p.pais === pais).flatMap((p) => p.valores);
  return maisAlta(de("BR"), DO_BRASIL) ?? maisAlta(de("US"), equivalenciasEua);
}

/** Filme (`release_dates`): a mais alta do Brasil; sem ela, a mais alta dos EUA (MPA). */
export function classificacaoDoFilme(
  paises: { iso_3166_1: string; release_dates: { certification: string }[] }[],
): ClassificacaoBR | null {
  return deduzir(
    paises.map((p) => ({
      pais: p.iso_3166_1,
      valores: p.release_dates.map((d) => d.certification),
    })),
    EQUIVALENCIAS_MPA,
  );
}

/** Série (`content_ratings`): a do Brasil; sem ela, a dos EUA (TV Parental Guidelines). */
export function classificacaoDaSerie(
  paises: { iso_3166_1: string; rating: string }[],
): ClassificacaoBR | null {
  return deduzir(
    paises.map((p) => ({ pais: p.iso_3166_1, valores: [p.rating] })),
    EQUIVALENCIAS_TV,
  );
}

/** Temas da classificação, já traduzidos (SPEC/2026-11-23-filtro-idade.md, "Temas"). */
export const TEMAS = [
  "violencia",
  "medo",
  "sexo",
  "drogas",
  "linguagem",
  "impactante",
  "discriminacao",
] as const;
export type Tema = (typeof TEMAS)[number];

export const ROTULOS_TEMA: Record<Tema, string> = {
  violencia: "violência",
  medo: "medo",
  sexo: "sexo",
  drogas: "drogas",
  linguagem: "linguagem imprópria",
  impactante: "conteúdo impactante",
  discriminacao: "discriminação",
};

/** Palavras-chave de cada tema nos `descriptors` do TMDB, que vêm em inglês. */
const PALAVRAS_TEMA: Record<Tema, RegExp> = {
  violencia: /violen|gory|gore|injur|blood/i,
  medo: /fear|horror|threat|anxiety|frighten|scar/i,
  sexo: /sex|nudity/i,
  drogas: /drug|alcohol|smok/i,
  linguagem: /language|profan/i,
  impactante: /shock|disturb/i,
  discriminacao: /discrimin/i,
};

/** Os países cujos temas valem, em ordem: o do selo primeiro. */
export const PAISES_TEMAS = ["BR", "NL", "DE"] as const;
export type PaisTemas = (typeof PAISES_TEMAS)[number];

export const NOMES_PAIS_TEMAS: Record<PaisTemas, string> = {
  BR: "do Brasil",
  NL: "da Holanda",
  DE: "da Alemanha",
};

export type TemasClassificacao = { temas: Tema[]; pais: PaisTemas };

/** Os temas reconhecidos destes textos, sem repetir e na ordem de `TEMAS`. */
export function traduzirTemas(textos: string[]): Tema[] {
  return TEMAS.filter((tema) => textos.some((texto) => PALAVRAS_TEMA[tema].test(texto)));
}

function temasPorPais(porPais: { pais: string; textos: string[] }[]): TemasClassificacao | null {
  for (const pais of PAISES_TEMAS) {
    const textos = porPais.filter((p) => p.pais === pais).flatMap((p) => p.textos);
    const temas = traduzirTemas(textos);
    if (temas.length > 0) return { temas, pais };
  }
  return null;
}

/** Temas do filme: os do Brasil; sem eles, os da Holanda e depois os da Alemanha. */
export function temasDoFilme(
  paises: { iso_3166_1: string; release_dates: { descriptors?: string[] }[] }[],
): TemasClassificacao | null {
  return temasPorPais(
    paises.map((p) => ({
      pais: p.iso_3166_1,
      textos: p.release_dates.flatMap((d) => d.descriptors ?? []),
    })),
  );
}

/** Temas da série, na mesma ordem de países. */
export function temasDaSerie(
  paises: { iso_3166_1: string; descriptors?: string[] }[],
): TemasClassificacao | null {
  return temasPorPais(paises.map((p) => ({ pais: p.iso_3166_1, textos: p.descriptors ?? [] })));
}
