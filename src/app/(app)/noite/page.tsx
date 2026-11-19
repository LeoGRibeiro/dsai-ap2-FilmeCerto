import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { exigirUsuario } from "@/features/auth/sessao";
import { AteQueHoras } from "@/features/noite/components/ate-que-horas";
import { PerguntaNoite } from "@/features/noite/components/pergunta-noite";
import { EsqueletoNoite, RecomendacaoNoite } from "@/features/noite/components/recomendacao-noite";
import {
  lerEstado,
  proximaPergunta,
  respostasCompletas,
  urlDaNoite,
} from "@/features/noite/estado";
import { obterPreferencias } from "@/features/preferencias/consultas";

export const metadata: Metadata = { title: "O que ver hoje?" };

/**
 * Wizard "O que ver hoje?" (SPEC/2026-11-18-wizard-noite.md). Todo o estado está na URL:
 * sem as três respostas, mostra a próxima pergunta; com elas, a recomendação da rodada,
 * com o "Até que horas?" opcional acima (SPEC/2026-11-18-noite-ate-que-horas.md).
 */
export default async function NoitePage({ searchParams }: PageProps<"/noite">) {
  await exigirUsuario();
  const preferencias = await obterPreferencias();
  if (!preferencias) redirect("/onboarding");

  const estado = lerEstado(await searchParams);
  const pergunta = proximaPergunta(estado);
  const respostas = respostasCompletas(estado);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      {pergunta && <PerguntaNoite estado={estado} pergunta={pergunta} />}
      {respostas && (
        <div className="flex flex-col gap-6">
          <AteQueHoras estado={estado} />
          {/* A chave mostra o esqueleto de novo a cada troca, em vez da rodada anterior. */}
          <Suspense key={urlDaNoite(estado)} fallback={<EsqueletoNoite />}>
            <RecomendacaoNoite respostas={respostas} estado={estado} perfil={preferencias} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
