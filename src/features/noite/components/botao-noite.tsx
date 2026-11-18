import { cn } from "cn";
import { Sparkles } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ROTA_NOITE } from "@/features/noite/estado";

/** Destaque do dashboard: este clique e as três respostas levam ao filme da noite. */
export function BotaoNoite() {
  return (
    <Link
      href={ROTA_NOITE}
      className={cn(buttonVariants({ size: "lg" }), "h-12 w-full gap-2 px-6 text-base sm:w-auto")}
    >
      <Sparkles className="size-5" aria-hidden="true" />O que ver hoje?
    </Link>
  );
}
