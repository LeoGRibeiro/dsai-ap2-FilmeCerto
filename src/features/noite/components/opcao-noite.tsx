import type { ReactNode } from "react";

import {
  anoEDuracao,
  PosterNoite,
  type FilmeNaTela,
} from "@/features/noite/components/filme-destaque";
import { TerminaAs } from "@/features/noite/components/termina-as";

/** Uma das 2 opções menores que aparecem depois de "Esse não". `acao` é o "Vou ver esse!". */
export function OpcaoNoite({ filme, acao }: { filme: FilmeNaTela; acao?: ReactNode }) {
  return (
    <article
      aria-labelledby={`opcao-${filme.id}`}
      className="border-border bg-card flex gap-4 rounded-xl border p-3"
    >
      <PosterNoite filme={filme} className="w-20 sm:w-24" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 id={`opcao-${filme.id}`} className="leading-tight font-medium break-words">
          {filme.titulo}
        </h3>
        <p className="text-muted-foreground text-sm">
          {[anoEDuracao(filme), filme.provedor?.nome].filter(Boolean).join(" · ")}
        </p>
        {filme.duracaoMin && <TerminaAs duracaoMin={filme.duracaoMin} />}
        {acao}
      </div>
    </article>
  );
}
