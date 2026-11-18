import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TabelaMetricas } from "@/features/metricas/components/tabela-metricas";
import { obterMetricas } from "@/features/metricas/consultas";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Métricas de uso", robots: { index: false } };

/** Totais de uso, só para quem está em `equipe_metricas` (SPEC/2026-11-18-metricas.md). */
export default async function MetricasPage() {
  const metricas = await obterMetricas(await createClient());
  if (!metricas) notFound();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl tracking-tight">Métricas de uso</h1>
        <p className="text-muted-foreground">
          Totais desde o início da medição. A coluna “Sem a equipe” exclui a dupla e os clientes.
        </p>
      </header>
      <TabelaMetricas metricas={metricas} />
    </div>
  );
}
