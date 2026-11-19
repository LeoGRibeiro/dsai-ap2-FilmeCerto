import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ROTA_NOITE, urlDaNoite, type EstadoNoite } from "@/features/noite/estado";
import { ATE_A_HORA, type HoraLimite } from "@/features/noite/opcoes";

type Props = { estado: EstadoNoite; ate: HoraLimite; tempo: number };

/**
 * "Até que horas?" sem tempo para um filme: a hora já passou ou falta pouco. Em vez de
 * sugerir um filme que passa do horário, oferece ver sem limite ou refazer as perguntas.
 */
export function SemTempo({ estado, ate, tempo }: Props) {
  const falta =
    tempo === 0 ? "Esse horário já passou." : `Faltam só ${tempo} minuto${tempo === 1 ? "" : "s"}.`;

  return (
    <section aria-labelledby="sem-tempo" className="flex flex-col items-start gap-4 py-8">
      <h1 id="sem-tempo" className="text-3xl tracking-tight text-balance">
        Não dá tempo de ver um filme {ATE_A_HORA[ate]}
      </h1>
      <p className="text-muted-foreground">
        {falta} Escolha um horário mais tarde ou veja sem limite de horário.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href={urlDaNoite({ ...estado, ate: null, tempo: null })}
          className={buttonVariants({ size: "lg" })}
        >
          Tanto faz o horário
        </Link>
        <Link href={ROTA_NOITE} className={buttonVariants({ size: "lg", variant: "outline" })}>
          Refazer as perguntas
        </Link>
      </div>
    </section>
  );
}
