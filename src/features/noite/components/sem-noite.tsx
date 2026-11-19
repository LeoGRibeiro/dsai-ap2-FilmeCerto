import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { inicioDaNoite } from "@/features/noite/estado";
import type { TipoMidia } from "@/lib/midia";

/** Nenhum filme (ou série) passou pelos filtros, pelo perfil e pelo que já foi mostrado. */
export function SemNoite({ tipo = "filme" }: { tipo?: TipoMidia }) {
  return (
    <section aria-labelledby="sem-noite" className="flex flex-col items-start gap-4 py-8">
      <h1 id="sem-noite" className="text-3xl tracking-tight text-balance">
        Não achamos nada para essa noite
      </h1>
      <p className="text-muted-foreground">
        Com essas respostas, e sem repetir o que você já viu, não sobrou{" "}
        {tipo === "serie" ? "nenhuma série" : "nenhum filme"}. Que tal tentar outras respostas?
      </p>
      <Link href={inicioDaNoite(tipo)} className={buttonVariants({ size: "lg" })}>
        Refazer as perguntas
      </Link>
    </section>
  );
}
