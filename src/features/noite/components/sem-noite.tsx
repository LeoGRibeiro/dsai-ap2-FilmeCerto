import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ROTA_NOITE } from "@/features/noite/estado";

/** Nenhum filme passou pelos filtros, pelo perfil e pelo que já foi mostrado. */
export function SemNoite() {
  return (
    <section aria-labelledby="sem-noite" className="flex flex-col items-start gap-4 py-8">
      <h1 id="sem-noite" className="text-3xl tracking-tight text-balance">
        Não achamos nada para essa noite
      </h1>
      <p className="text-muted-foreground">
        Com essas respostas, e sem repetir o que você já viu, não sobrou nenhum filme. Que tal
        tentar outras respostas?
      </p>
      <Link href={ROTA_NOITE} className={buttonVariants({ size: "lg" })}>
        Refazer as perguntas
      </Link>
    </section>
  );
}
