import { cn } from "cn";
import { Sparkles } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { inicioDaNoite } from "@/features/noite/estado";

/** Altura e largura dos dois botões do topo do dashboard, para ficarem alinhados. */
export const CLASSE_BOTAO_TOPO = "h-12 w-full gap-2 px-6 text-base sm:w-auto";

/**
 * Destaque do dashboard: este clique e as três respostas levam ao filme da noite. A série é
 * escolhida no "Filme ou série?" da primeira tela do wizard (SPEC/2026-11-18-series-noite.md).
 */
export function BotaoNoite() {
  return (
    <Link
      href={inicioDaNoite("filme")}
      className={cn(buttonVariants({ size: "lg" }), CLASSE_BOTAO_TOPO)}
    >
      <Sparkles className="size-5" aria-hidden="true" />O que ver hoje?
    </Link>
  );
}
