import { rotuloClassificacao } from "@/features/serie/formatar";
import { cn } from "@/lib/utils";
import type { ClassificacaoBR } from "@/lib/tmdb/tipos";

/** As cores da classificação indicativa brasileira. */
const CORES: Record<ClassificacaoBR, string> = {
  L: "bg-[#0c9447] text-white",
  "10": "bg-[#0f7dc2] text-white",
  "12": "bg-[#f8c411] text-black",
  "14": "bg-[#e67824] text-black",
  "16": "bg-[#db2827] text-white",
  "18": "bg-black text-white ring-1 ring-white/50",
};

/** Selo "14" ao lado da nota. Sem classificação, não aparece. */
export function SeloClassificacao({ classificacao }: { classificacao: ClassificacaoBR | null }) {
  if (!classificacao) return null;
  const rotulo = rotuloClassificacao(classificacao)!;
  return (
    <span
      data-testid="selo-classificacao"
      title={`Classificação indicativa: ${rotulo}`}
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-xs leading-none font-bold",
        CORES[classificacao],
      )}
    >
      <span aria-hidden="true">{classificacao}</span>
      <span className="sr-only">Classificação: {rotulo}</span>
    </span>
  );
}
