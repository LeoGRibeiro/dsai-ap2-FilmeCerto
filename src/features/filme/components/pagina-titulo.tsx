import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/** Partes comuns às páginas de filme e de série. */

export function Voltar() {
  return (
    <Link
      href="/dashboard"
      className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
    >
      <ArrowLeft className="size-4" aria-hidden="true" /> Voltar
    </Link>
  );
}

/** Seção da página, com o título em h2. */
export function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl tracking-tight">{titulo}</h2>
      {children}
    </section>
  );
}
