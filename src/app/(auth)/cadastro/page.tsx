import type { Metadata } from "next";

import { CadastroForm } from "@/features/auth/components/cadastro-form";
import { sanitizarNext } from "@/features/auth/redirecionamento";

export const metadata: Metadata = { title: "Criar conta" };

export default async function CadastroPage({ searchParams }: PageProps<"/cadastro">) {
  const { next } = await searchParams;
  const destino = typeof next === "string" ? sanitizarNext(next) : undefined;

  return (
    <>
      <h1 className="mb-1 text-3xl tracking-tight">Criar conta</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Leva menos de um minuto e as recomendações ficam do seu jeito.
      </p>
      <CadastroForm next={destino} />
    </>
  );
}
