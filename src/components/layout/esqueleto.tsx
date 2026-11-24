import { cn } from "cn";
import type { ReactNode } from "react";

/** Retângulo cinza pulsando: a peça de todos os esqueletos. */
export function Bloco({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("bg-muted animate-pulse rounded", className)} />;
}

/**
 * Tela carregando, mostrada pelos `loading.tsx` assim que a pessoa clica num link, antes
 * de o servidor responder (SPEC/2026-11-23-navegacao-rapida.md). Anuncia "Carregando…"
 * para leitor de tela e usa a mesma largura e margem da tela de destino.
 */
export function EsqueletoPagina({
  className = "max-w-6xl",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn("mx-auto flex w-full flex-1 flex-col gap-8 px-4 py-8", className)}
    >
      <span className="sr-only">Carregando…</span>
      {children}
    </div>
  );
}

/** Página de filme ou série: "Voltar", cartão com pôster, título e dados, e a sinopse. */
export function EsqueletoTitulo() {
  return (
    <EsqueletoPagina className="max-w-6xl gap-10">
      <Bloco className="h-5 w-20" />
      <div className="border-border/60 bg-card flex flex-col gap-6 rounded-2xl border p-4 sm:p-8 md:flex-row md:items-end">
        <Bloco className="aspect-[2/3] w-40 shrink-0 rounded-lg sm:w-52" />
        <div className="flex flex-1 flex-col gap-3">
          <Bloco className="h-12 w-3/4 sm:h-16" />
          <Bloco className="h-4 w-1/3" />
          <Bloco className="h-10 w-full max-w-sm rounded-lg" />
        </div>
      </div>
      <div className="flex max-w-3xl flex-col gap-2">
        <Bloco className="h-4 w-full" />
        <Bloco className="h-4 w-full" />
        <Bloco className="h-4 w-2/3" />
      </div>
    </EsqueletoPagina>
  );
}
