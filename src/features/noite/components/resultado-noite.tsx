"use client";

import { useEffect } from "react";

import { MAX_TROCAS, type Clima } from "@/features/metricas/eventos";
import { EsseNao } from "@/features/noite/components/esse-nao";
import { FilmeDestaque, type FilmeNaTela } from "@/features/noite/components/filme-destaque";
import { OpcaoNoite } from "@/features/noite/components/opcao-noite";
import { useSessaoNoite } from "@/features/noite/components/sessao-noite";
import type { MotivoTroca } from "@/features/noite/estado";

type Props = {
  respostas: Clima;
  /** Trocas já feitas nesta sessão (0 na primeira recomendação). */
  trocas: number;
  destaque: FilmeNaTela;
  /** As 2 opções menores, depois de uma troca. */
  opcoes: FilmeNaTela[];
  /** URL da próxima rodada por motivo de "Esse não", ou `null` no limite. */
  proximas: Record<MotivoTroca, string> | null;
};

/** Tela do resultado: o destaque, "Esse não" e as opções. Na primeira rodada, conclui o wizard. */
export function ResultadoNoite({ respostas, trocas, destaque, opcoes, proximas }: Props) {
  const { concluir } = useSessaoNoite();

  useEffect(() => {
    if (trocas === 0) concluir(respostas);
  }, [concluir, respostas, trocas]);

  return (
    <div className="flex flex-col gap-10">
      <FilmeDestaque
        filme={destaque}
        acoes={
          <EsseNao proximas={proximas} trocasRestantes={MAX_TROCAS - trocas} destaque={destaque} />
        }
      />
      {opcoes.length > 0 && (
        <section aria-labelledby="ou-talvez" className="flex flex-col gap-3">
          <h2 id="ou-talvez" className="text-xl tracking-tight">
            Ou talvez
          </h2>
          <ul className="flex flex-col gap-3">
            {opcoes.map((filme) => (
              <li key={filme.id}>
                <OpcaoNoite filme={filme} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
