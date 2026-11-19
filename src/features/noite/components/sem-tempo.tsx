import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { inicioDaNoite, urlDaNoite, type EstadoNoite } from "@/features/noite/estado";
import { rotuloJanela } from "@/features/noite/opcoes";
import { ateAs } from "@/features/noite/termina";

type Props = { estado: EstadoNoite; tempo: number };

const minutos = (n: number) => `${n} minuto${n === 1 ? "" : "s"}`;

/**
 * "Até que horas?" sem tempo para um filme (ou um episódio): a hora já passou ou falta pouco.
 * Em vez de sugerir algo que passa do horário, oferece ver sem limite ou refazer as perguntas.
 */
export function SemTempo({ estado, tempo }: Props) {
  const { ate } = estado;
  const quando =
    ate === null ? `em ${tempo < 60 ? minutos(tempo) : rotuloJanela(tempo)}` : ateAs(ate);
  const falta =
    ate === null ? "" : tempo === 0 ? "Esse horário já passou." : `Faltam só ${minutos(tempo)}.`;

  return (
    <section aria-labelledby="sem-tempo" className="flex flex-col items-start gap-4 py-8">
      <h1 id="sem-tempo" className="text-3xl tracking-tight text-balance">
        Não dá tempo de ver {estado.tipo === "serie" ? "um episódio" : "um filme"} {quando}
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
        <Link
          href={inicioDaNoite(estado.tipo)}
          className={buttonVariants({ size: "lg", variant: "outline" })}
        >
          Refazer as perguntas
        </Link>
      </div>
    </section>
  );
}
