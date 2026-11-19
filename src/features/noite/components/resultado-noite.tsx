"use client";

import { useEffect, useState } from "react";

import { VouVerEsse } from "@/features/como-foi/components/vou-ver-esse";
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

/**
 * Tela do resultado: o destaque e as opções, cada um com "Vou ver esse!", e "Esse não".
 * Na primeira rodada, conclui o wizard. Depois da escolha, só fica a confirmação do escolhido.
 */
export function ResultadoNoite({ respostas, trocas, destaque, opcoes, proximas }: Props) {
  const { concluir, marcarEscolha } = useSessaoNoite();
  const [escolhido, setEscolhido] = useState<number | null>(null);

  useEffect(() => {
    if (trocas === 0) concluir(respostas);
  }, [concluir, respostas, trocas]);

  const vouVer = (filme: FilmeNaTela) =>
    (escolhido === null || escolhido === filme.id) && (
      <VouVerEsse
        tmdbId={filme.id}
        titulo={filme.titulo}
        trocas={trocas}
        aoEscolher={() => {
          setEscolhido(filme.id);
          marcarEscolha();
        }}
      />
    );

  return (
    <div className="flex flex-col gap-10">
      <FilmeDestaque
        filme={destaque}
        acoes={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            {vouVer(destaque)}
            {escolhido === null && (
              <EsseNao
                proximas={proximas}
                trocasRestantes={MAX_TROCAS - trocas}
                destaque={destaque}
              />
            )}
          </div>
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
                <OpcaoNoite filme={filme} acao={vouVer(filme)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
