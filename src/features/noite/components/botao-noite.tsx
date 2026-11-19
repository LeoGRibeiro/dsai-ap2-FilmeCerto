import { cn } from "cn";
import { Sparkles } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { inicioDaNoite } from "@/features/noite/estado";

/**
 * Destaque do dashboard: este clique e as três respostas levam ao filme da noite. "Prefiro uma
 * série" responde "Filme ou série?" no mesmo clique, então a série também fica a 4 cliques
 * (SPEC/2026-11-18-series-noite.md).
 */
export function BotaoNoite() {
  return (
    <div className="flex w-full flex-col items-stretch gap-1 sm:w-auto sm:items-center">
      <Link
        href={inicioDaNoite("filme")}
        className={cn(buttonVariants({ size: "lg" }), "h-12 w-full gap-2 px-6 text-base sm:w-auto")}
      >
        <Sparkles className="size-5" aria-hidden="true" />O que ver hoje?
      </Link>
      <Link
        href={inicioDaNoite("serie")}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex min-h-11 items-center justify-center rounded-lg px-2 text-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3"
      >
        Prefiro uma série
      </Link>
    </div>
  );
}
