"use client";

import { useEffect } from "react";

import type { Clima } from "@/features/metricas/eventos";
import { FilmeDestaque, type FilmeNaTela } from "@/features/noite/components/filme-destaque";
import { useSessaoNoite } from "@/features/noite/components/sessao-noite";

type Props = {
  respostas: Clima;
  /** Trocas já feitas nesta sessão (0 na primeira recomendação). */
  trocas: number;
  destaque: FilmeNaTela;
};

/** Tela do resultado: o destaque da rodada. Na primeira rodada, conclui o wizard. */
export function ResultadoNoite({ respostas, trocas, destaque }: Props) {
  const { concluir } = useSessaoNoite();

  useEffect(() => {
    if (trocas === 0) concluir(respostas);
  }, [concluir, respostas, trocas]);

  return (
    <div className="flex flex-col gap-10">
      <FilmeDestaque filme={destaque} />
    </div>
  );
}
