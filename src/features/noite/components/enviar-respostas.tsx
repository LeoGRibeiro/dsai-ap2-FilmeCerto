"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import type { Clima } from "@/features/metricas/eventos";
import { ROTULOS_CLIMA } from "@/features/metricas/rotulos";
import { responderSala } from "@/features/noite/actions-sala";
import { rotaDaSala } from "@/features/noite/estado";

/** As três respostas da sala e "Enviar respostas" (só aí elas vão para a sala). */
export function EnviarRespostas({ sala, respostas }: { sala: string; respostas: Clima }) {
  const [mensagem, setMensagem] = useState<string>();
  const [enviando, iniciar] = useTransition();

  function enviar() {
    iniciar(async () => {
      const resultado = await responderSala(sala, respostas);
      setMensagem(resultado?.mensagem);
    });
  }

  return (
    <section aria-labelledby="suas-respostas" className="flex flex-col items-start gap-4">
      <h1 id="suas-respostas" className="text-3xl tracking-tight">
        Suas respostas
      </h1>
      <p className="text-lg">
        {[respostas.humor, respostas.experiencia, respostas.companhia]
          .map((valor) => ROTULOS_CLIMA[valor])
          .join(" · ")}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" className="h-12 px-6 text-base" onClick={enviar} disabled={enviando}>
          Enviar respostas
        </Button>
        <Link
          href={rotaDaSala(sala)}
          className={buttonVariants({ variant: "outline", size: "lg", className: "h-12 px-6" })}
        >
          Responder de novo
        </Link>
      </div>
      {mensagem && (
        <p role="alert" className="text-destructive text-sm">
          {mensagem}
        </p>
      )}
    </section>
  );
}
