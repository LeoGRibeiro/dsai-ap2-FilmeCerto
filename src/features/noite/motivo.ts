import type { Clima } from "@/features/metricas/eventos";
import type { Tom } from "@/features/noite/mapeamento";
import { TRECHOS } from "@/features/noite/opcoes";
import type { OndeAssistir, Provedor } from "@/lib/tmdb/tipos";

/** "na Netflix", "no Globoplay": artigo de cada streaming da lista do onboarding, pelo ID. */
const ARTIGOS: Record<number, "na" | "no"> = {
  8: "na",
  119: "no",
  337: "no",
  1899: "na",
  307: "no",
  350: "na",
  531: "no",
  283: "na",
  11: "no",
};

const nota = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** O streaming por assinatura a citar: um dos da pessoa, se houver; senão, o primeiro. */
export function provedorDaNoite(
  onde: OndeAssistir | null,
  streamings: readonly number[],
): Provedor | null {
  const assinatura = onde?.assinatura ?? [];
  return assinatura.find(({ id }) => streamings.includes(id)) ?? assinatura[0] ?? null;
}

function ondeVer(provedor: Provedor | null): string {
  if (!provedor) return "não está nos seus streamings";
  return `está ${ARTIGOS[provedor.id] ?? "em"} ${provedor.nome}`;
}

/**
 * "Você está cansado, quer rir e vai ver a dois: comédia leve, nota 7,8, está na Netflix."
 * Só usa as respostas, o tom da rodada e o filme; nunca os gêneros favoritos.
 */
export function motivoDaNoite(
  respostas: Clima,
  tom: Tom,
  filme: { nota: number },
  provedor: Provedor | null,
): string {
  const humor = TRECHOS.humor[respostas.humor];
  const experiencia = TRECHOS.experiencia[respostas.experiencia];
  const companhia = TRECHOS.companhia[respostas.companhia];
  const filmeDaNoite = `${tom.nome}, nota ${nota.format(filme.nota)}, ${ondeVer(provedor)}`;
  return `${humor}, ${experiencia} e ${companhia}: ${filmeDaNoite}.`;
}
