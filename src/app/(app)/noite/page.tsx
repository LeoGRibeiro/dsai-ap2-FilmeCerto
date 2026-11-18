import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { exigirUsuario } from "@/features/auth/sessao";
import { PerguntaNoite } from "@/features/noite/components/pergunta-noite";
import { lerEstado, proximaPergunta } from "@/features/noite/estado";
import { obterPreferencias } from "@/features/preferencias/consultas";

export const metadata: Metadata = { title: "O que ver hoje?" };

/**
 * Wizard "O que ver hoje?" (SPEC/2026-11-18-wizard-noite.md). Todo o estado está na URL:
 * sem as três respostas, mostra a próxima pergunta; com elas, a recomendação da rodada.
 */
export default async function NoitePage({ searchParams }: PageProps<"/noite">) {
  await exigirUsuario();
  const preferencias = await obterPreferencias();
  if (!preferencias) redirect("/onboarding");

  const estado = lerEstado(await searchParams);
  const pergunta = proximaPergunta(estado);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      {pergunta && <PerguntaNoite estado={estado} pergunta={pergunta} />}
    </div>
  );
}
