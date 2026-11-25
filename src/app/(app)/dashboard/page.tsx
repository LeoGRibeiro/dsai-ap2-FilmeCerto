import { cn } from "cn";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { exigirUsuario } from "@/features/auth/sessao";
import { PerguntaComoFoi } from "@/features/como-foi/components/pergunta-como-foi";
import { obterComoFoi } from "@/features/como-foi/consultas";
import { EsqueletoSecoes } from "@/features/dashboard/components/esqueleto-secoes";
import { SecaoSeries } from "@/features/dashboard/components/secao-series";
import { SecoesRecomendadas } from "@/features/dashboard/components/secoes-recomendadas";
import { lerRodada } from "@/features/dashboard/rodada";
import { semBloqueados } from "@/features/filtro-conteudo/aplicar";
import { classificarMidia } from "@/features/filtro-conteudo/classificar";
import { obterFiltro } from "@/features/filtro-conteudo/consultas";
import { idsNasListas } from "@/features/listas/consultas";
import { BotaoNoite, CLASSE_BOTAO_TOPO } from "@/features/noite/components/botao-noite";
import { obterPreferencias } from "@/features/preferencias/consultas";
import { resumirPreferencias } from "@/features/preferencias/resumo";
import { obterReacoes } from "@/features/reacoes/consultas";
import { AvisosEpisodios } from "@/features/serie/components/avisos-episodios";
import {
  EsqueletoSurpresa,
  SurpresaDashboard,
} from "@/features/surpresa/components/surpresa-dashboard";

export const metadata: Metadata = { title: "Início" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const usuario = await exigirUsuario();
  const preferencias = await obterPreferencias();
  if (!preferencias) redirect("/onboarding");

  const rodada = lerRodada((await searchParams).rodada);
  const [reacoes, excluir, pergunta, filtro] = await Promise.all([
    obterReacoes(),
    idsNasListas(),
    obterComoFoi(),
    obterFiltro(),
  ]);
  // Com filtro, a pergunta sobre um título +18 escolhido antes não aparece.
  const [comoFoi = null] = await semBloqueados(
    pergunta ? [pergunta] : [],
    filtro,
    ({ tipo, tmdbId }) => ({ tipo, tmdbId }),
    classificarMidia,
  );
  const urlAtual = rodada ? `/dashboard?rodada=${rodada}` : "/dashboard";
  const proximaRodada = `/dashboard?rodada=${rodada + 1}`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl tracking-tight sm:text-5xl">Olá, {usuario.nome}</h1>
          <p className="text-muted-foreground" data-testid="resumo-preferencias">
            {resumirPreferencias(preferencias)}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <BotaoNoite />
          <Link
            href={proximaRodada}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), CLASSE_BOTAO_TOPO)}
          >
            Gerar outras recomendações
          </Link>
        </div>
      </header>

      {/* A chave troca o cartão quando outra escolha passa a ser a mais recente. */}
      {comoFoi && <PerguntaComoFoi key={comoFoi.id} pergunta={comoFoi} />}

      {/* Avisos de episódio novo: leem o TMDB das séries acompanhadas, então não seguram o início. */}
      <Suspense fallback={null}>
        <AvisosEpisodios usuarioId={usuario.id} filtro={filtro} />
      </Suspense>

      {/* A chave por rodada mostra o esqueleto de novo a cada "Gerar outras recomendações". */}
      <Suspense key={rodada} fallback={<EsqueletoSecoes />}>
        <SecoesRecomendadas
          entrada={{
            preferencias,
            usuarioId: usuario.id,
            data: new Date(),
            rodada,
            reacoes,
            excluir,
            filtro,
          }}
          urlAtual={urlAtual}
          proximaRodada={proximaRodada}
          meio={
            <Suspense fallback={<EsqueletoSurpresa />}>
              <SurpresaDashboard
                preferencias={preferencias}
                excluir={[...excluir, ...reacoes.map((reacao) => reacao.tmdbId)]}
                filtro={filtro}
              />
            </Suspense>
          }
        />
      </Suspense>

      <Suspense key={`series-${rodada}`} fallback={<EsqueletoSecoes secoes={1} />}>
        <SecaoSeries
          preferencias={preferencias}
          rodada={rodada}
          urlAtual={urlAtual}
          filtro={filtro}
        />
      </Suspense>
    </div>
  );
}
