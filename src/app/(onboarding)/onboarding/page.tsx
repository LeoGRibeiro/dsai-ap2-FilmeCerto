import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DESTINO_PADRAO, sanitizarNext } from "@/features/auth/redirecionamento";
import { exigirUsuario } from "@/features/auth/sessao";
import { OnboardingWizard } from "@/features/preferencias/components/onboarding-wizard";
import { obterPreferencias } from "@/features/preferencias/consultas";

export const metadata: Metadata = { title: "Suas preferências" };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const { next } = await searchParams;
  const destino = typeof next === "string" ? sanitizarNext(next) : undefined;
  const usuario = await exigirUsuario();
  if (await obterPreferencias()) redirect(destino ?? DESTINO_PADRAO);

  return (
    <section className="flex flex-1 items-start justify-center px-4 py-12 sm:py-16">
      <div className="border-border bg-card w-full max-w-2xl rounded-2xl border p-6 shadow-2xl shadow-black/40 sm:p-8">
        <h1 className="mb-2 text-3xl tracking-tight">Conte do que você gosta</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          {usuario.nome}, são poucas perguntas para montar recomendações do seu jeito. Só as três
          primeiras são obrigatórias.
        </p>
        <OnboardingWizard next={destino} />
      </div>
    </section>
  );
}
