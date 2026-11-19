"use client";

import Link from "next/link";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { VouVerEsse } from "@/features/como-foi/components/vou-ver-esse";
import { ROTA_NOITE } from "@/features/noite/estado";
import { FilmeDestaque, type FilmeNaTela } from "@/features/noite/components/filme-destaque";
import { OpcaoNoite } from "@/features/noite/components/opcao-noite";

/**
 * A sugestão da sala, igual para as duas pessoas: o destaque e as 2 opções, cada um com
 * "Vou ver esse!". Depois da escolha, só o escolhido mantém a confirmação.
 */
export function ResultadoSala({ filmes }: { filmes: FilmeNaTela[] }) {
  const [escolhido, setEscolhido] = useState<number | null>(null);
  const [destaque, ...opcoes] = filmes;

  if (!destaque) {
    return (
      <section aria-labelledby="sem-filme-sala" className="flex flex-col items-start gap-4">
        <h1 id="sem-filme-sala" className="text-3xl tracking-tight text-balance">
          Não achamos um filme que agrade aos dois
        </h1>
        <p className="text-muted-foreground">
          Com as respostas e os perfis de vocês, não sobrou nenhum filme. Cada um pode tentar o
          wizard sozinho.
        </p>
        <Link href={ROTA_NOITE} className={buttonVariants({ size: "lg" })}>
          Escolher sozinho
        </Link>
      </section>
    );
  }

  const vouVer = (filme: FilmeNaTela) =>
    (escolhido === null || escolhido === filme.id) && (
      <VouVerEsse
        tmdbId={filme.id}
        titulo={filme.titulo}
        trocas={0}
        aoEscolher={() => setEscolhido(filme.id)}
      />
    );

  return (
    <div className="flex flex-col gap-10">
      <FilmeDestaque filme={destaque} acoes={vouVer(destaque)} />
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
