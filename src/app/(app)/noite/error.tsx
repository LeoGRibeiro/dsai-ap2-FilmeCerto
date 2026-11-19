"use client";

import { RotateCw } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";

/** O TMDB (ou o banco) falhou: refazer as perguntas não resolveria, então oferece tentar de novo. */
export default function ErroNoite({ retry }: { error: Error; retry: () => void }) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start gap-4 px-4 py-16">
      <h1 className="text-3xl tracking-tight text-balance">
        Não deu para montar a sua noite agora.
      </h1>
      <p className="text-muted-foreground">
        Não conseguimos buscar os filmes agora. Costuma ser passageiro: tente de novo em instantes.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button size="lg" onClick={() => retry()}>
          <RotateCw aria-hidden="true" />
          Tentar de novo
        </Button>
        <Link href="/dashboard" className={buttonVariants({ size: "lg", variant: "outline" })}>
          Ir para o início
        </Link>
      </div>
    </section>
  );
}
