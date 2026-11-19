import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FunilMetricas } from "@/features/metricas/components/funil-metricas";
import { TabelaMetricas } from "@/features/metricas/components/tabela-metricas";
import { obterMetricas } from "@/features/metricas/consultas";
import { lerRecorte } from "@/features/metricas/funil";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Métricas de uso", robots: { index: false } };

/**
 * Totais de uso, só para quem está em `equipe_metricas` (SPEC/2026-11-18-metricas.md),
 * com o funil e os detalhes no recorte de `?recorte=` (SPEC/2026-11-18-metricas-funil.md).
 */
export default async function MetricasPage({ searchParams }: PageProps<"/metricas">) {
  const metricas = await obterMetricas(await createClient());
  if (!metricas) notFound();
  const recorte = lerRecorte((await searchParams).recorte);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl tracking-tight">Métricas de uso</h1>
        <p className="text-muted-foreground">
          Totais desde o início da medição. A coluna “Sem a equipe” exclui a dupla e os clientes.
        </p>
      </header>
      <FunilMetricas metricas={metricas} recorte={recorte} />
      <TabelaMetricas metricas={metricas} />
    </div>
  );
}
