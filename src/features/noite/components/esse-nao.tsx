"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { alternarLista } from "@/features/listas/actions";
import { enviarEvento } from "@/features/metricas/enviar";
import { MOTIVOS_TROCA } from "@/features/metricas/eventos";
import { inicioDaNoite, type MotivoTroca } from "@/features/noite/estado";
import type { TipoMidia } from "@/lib/midia";
import { ROTULOS_MOTIVO } from "@/features/noite/opcoes";

type Props = {
  /** URL da próxima rodada por motivo (calculada no servidor), ou `null` no limite de trocas. */
  proximas: Record<MotivoTroca, string> | null;
  trocasRestantes: number;
  /** O destaque da rodada, que "Já vi" pode marcar como "Já assisti" (filme quando falta o tipo). */
  destaque: { tipo?: TipoMidia; id: number; titulo: string };
};

/**
 * "Esse não": pede o porquê, registra `wizard_troca` e vai para a próxima rodada.
 * "Já vi" oferece marcar o destaque como "Já assisti". No limite, oferece refazer as perguntas.
 */
export function EsseNao({ proximas, trocasRestantes, destaque }: Props) {
  const router = useRouter();
  const [etapa, setEtapa] = useState<"botao" | "motivos" | "ja-vi">("botao");
  const [erro, setErro] = useState<string>();
  const [trocando, iniciar] = useTransition();

  if (!proximas) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-muted-foreground text-sm">Você chegou ao limite de trocas.</p>
        <Link
          href={inicioDaNoite(destaque.tipo ?? "filme")}
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Refazer as perguntas
        </Link>
      </div>
    );
  }

  const trocar = (url: string) => iniciar(() => router.push(url));

  const escolher = (motivo: MotivoTroca) => {
    enviarEvento({ nome: "wizard_troca", dados: { motivo } });
    if (motivo === "ja-vi") setEtapa("ja-vi");
    else trocar(proximas[motivo]);
  };

  const marcarETrocar = () =>
    iniciar(async () => {
      const dados = new FormData();
      dados.set("tipo", destaque.tipo ?? "filme");
      dados.set("tmdbId", String(destaque.id));
      dados.set("status", "assistido");
      const { mensagem } = await alternarLista({}, dados);
      if (mensagem) setErro(mensagem);
      else router.push(proximas["ja-vi"]);
    });

  return (
    <div className="flex flex-col gap-3">
      {etapa === "botao" && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className="h-12 px-6 text-base"
            onClick={() => setEtapa("motivos")}
          >
            Esse não
          </Button>
          <p className="text-muted-foreground text-sm">Trocas restantes: {trocasRestantes}</p>
        </div>
      )}
      {etapa === "motivos" && (
        <div role="group" aria-label="Por que não?" className="grid grid-cols-2 gap-2 sm:flex">
          {MOTIVOS_TROCA.map((motivo) => (
            <Button
              key={motivo}
              variant="outline"
              className="h-12 text-base"
              disabled={trocando}
              onClick={() => escolher(motivo)}
            >
              {ROTULOS_MOTIVO[motivo]}
            </Button>
          ))}
        </div>
      )}
      {etapa === "ja-vi" && (
        <div className="flex flex-col gap-3">
          <p>
            Quer marcar <strong>{destaque.titulo}</strong> como “Já assisti”? Assim ele sai também
            das suas recomendações.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button className="h-12 text-base" disabled={trocando} onClick={marcarETrocar}>
              Marcar e trocar
            </Button>
            <Button
              variant="outline"
              className="h-12 text-base"
              disabled={trocando}
              onClick={() => trocar(proximas["ja-vi"])}
            >
              Só trocar
            </Button>
          </div>
        </div>
      )}
      {erro && (
        <p role="alert" className="text-destructive text-sm">
          {erro}
        </p>
      )}
    </div>
  );
}
