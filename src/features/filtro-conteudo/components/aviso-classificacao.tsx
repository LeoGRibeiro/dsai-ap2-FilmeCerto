import { TriangleAlert } from "lucide-react";
import Link from "next/link";

import type { ClassificacaoBR } from "@/lib/tmdb/tipos";

/** Texto da faixa: acima do limite, ou sem classificação nenhuma. */
export function textoDoAviso(classificacao: ClassificacaoBR | null): string {
  if (!classificacao) return "Este título não tem classificação indicativa.";
  return classificacao === "L"
    ? "Classificação livre."
    : `Não recomendado para menores de ${classificacao} anos.`;
}

/** Faixa no topo da página de um título acima da idade do filtro. A página continua aberta. */
export function AvisoClassificacao({ classificacao }: { classificacao: ClassificacaoBR | null }) {
  return (
    <div
      role="note"
      data-testid="aviso-classificacao"
      className="flex items-start gap-3 rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm"
    >
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-500" aria-hidden="true" />
      <p>
        <strong className="font-semibold">{textoDoAviso(classificacao)}</strong> O filtro por idade
        desta conta marca este título como não recomendado.{" "}
        <Link href="/perfil#conteudo-sensivel" className="underline underline-offset-2">
          Ver o filtro
        </Link>
      </p>
    </div>
  );
}
