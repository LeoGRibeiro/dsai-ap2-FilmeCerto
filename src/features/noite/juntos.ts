import type { Clima } from "@/features/metricas/eventos";
import { montarFiltros, tomPermitido, type FiltrosNoite } from "@/features/noite/filtros";
import { TONS, type Tom } from "@/features/noite/mapeamento";
import { trechoDoFilme } from "@/features/noite/motivo";
import { TRECHOS, type Experiencia } from "@/features/noite/opcoes";
import type { ClassificacaoBR, Provedor } from "@/lib/tmdb/tipos";

/**
 * "Noite a dois": as respostas de duas pessoas viram um só filtro e um só motivo.
 * Espelha as tabelas de `SPEC/2026-11-18-noite-a-dois.md`.
 */

/** "Só me distrair" funciona como o "tanto faz": a experiência da outra pessoa decide. */
const FLEXIVEL: Experiencia = "distrair";

/** Tom de cada par de experiências diferentes (sem `distrair`), pela chave em ordem alfabética. */
export const TONS_JUNTOS: Record<string, Tom> = {
  "emocionar+rir": { nome: "comédia dramática", generos: [35, 18] },
  "rir+susto": { nome: "terror com humor", generos: [27, 35] },
  "rir+tenso": { nome: "comédia de ação", generos: [35, 28] },
  "pensar+rir": { nome: "comédia de ficção científica", generos: [35, 878] },
  "emocionar+susto": { nome: "terror dramático", generos: [27, 18] },
  "emocionar+tenso": { nome: "drama policial", generos: [18, 80] },
  "emocionar+pensar": { nome: "drama de ficção científica", generos: [18, 878] },
  "susto+tenso": { nome: "terror de suspense", generos: [27, 53] },
  "pensar+susto": { nome: "terror de ficção científica", generos: [27, 878] },
  "pensar+tenso": { nome: "suspense de mistério", generos: [53, 9648] },
};

function chaveDoPar(a: Experiencia, b: Experiencia): string {
  return [a, b].sort().join("+");
}

/** O tom 1 de uma experiência no wizard. */
function tomDoWizard(experiencia: Experiencia): Tom {
  return TONS[experiencia].tons[0]!;
}

/** O tom da tabela para as duas experiências, antes de olhar os gêneros evitados. */
function tomDaTabela(a: Experiencia, b: Experiencia): Tom {
  if (a === b) return tomDoWizard(a);
  if (a === FLEXIVEL) return tomDoWizard(b);
  if (b === FLEXIVEL) return tomDoWizard(a);
  return TONS_JUNTOS[chaveDoPar(a, b)]!;
}

/**
 * O tom da sala: o da tabela; com gênero evitado, o tom 1 da experiência de quem criou a
 * sala (`a`) e depois o da outra pessoa. `null` se todos tiverem gênero evitado.
 */
export function tomJuntos(a: Clima, b: Clima, evitados: number[]): Tom | null {
  const candidatos = [
    tomDaTabela(a.experiencia, b.experiencia),
    tomDoWizard(a.experiencia),
    tomDoWizard(b.experiencia),
  ];
  return candidatos.find((tom) => tomPermitido(tom, evitados)) ?? null;
}

/**
 * Filtros do TMDB para as duas pessoas: o tom vem das duas experiências, e as restrições de
 * humor e companhia de cada uma valem para as duas (família de um lado só já vale).
 */
export function filtrosJuntos(
  a: Clima,
  b: Clima,
  evitados: number[],
  limiteDoFiltro: ClassificacaoBR | null = null,
): FiltrosNoite | null {
  const tom = tomJuntos(a, b, evitados);
  if (!tom) return null;
  const semDasExperiencias = [
    ...(TONS[a.experiencia].sem ?? []),
    ...(TONS[b.experiencia].sem ?? []),
  ];
  return montarFiltros({ tom, respostas: [a, b], evitados, semDasExperiencias, limiteDoFiltro });
}

/** "Os dois querem rir" ou "Um quer rir e o outro quer ficar tenso", e a família. */
function vontades(a: Clima, b: Clima): string {
  const quer = TRECHOS.experiencia;
  const inicio =
    a.experiencia === b.experiencia
      ? `Os dois ${quer[a.experiencia].replace(/^quer /, "querem ")}`
      : `Um ${quer[a.experiencia]} e o outro ${quer[b.experiencia]}`;
  const criancas = a.companhia === "familia" || b.companhia === "familia";
  return criancas ? `${inicio} e tem criança no sofá` : inicio;
}

/**
 * "Um quer rir e o outro quer ficar tenso: comédia de ação, nota 7,1, está na Netflix."
 * O fim da frase (tom, nota e onde ver) é o mesmo do wizard.
 */
export function motivoJuntos(
  a: Clima,
  b: Clima,
  tom: Tom,
  filme: { nota: number },
  provedor: Provedor | null,
): string {
  return `${vontades(a, b)}: ${trechoDoFilme(tom, filme, provedor)}`;
}
