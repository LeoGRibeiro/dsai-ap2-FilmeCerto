import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ROTA_NOITE } from "@/features/noite/estado";
import type { SalaIndisponivel as Motivo } from "@/features/noite/sala";

const TEXTOS: Record<Motivo, { titulo: string; texto: string }> = {
  cheia: {
    titulo: "Essa sala já tem duas pessoas",
    texto:
      "A sala da “Noite a dois” é só para quem criou e para a primeira pessoa que abriu o link.",
  },
  expirada: {
    titulo: "Essa sala expirou",
    texto: "As salas valem por 3 horas. Para escolher juntos de novo, crie outra sala no wizard.",
  },
  inexistente: {
    titulo: "Essa sala não existe",
    texto: "Confira se o link chegou inteiro, ou crie outra sala no wizard.",
  },
};

/** Link de uma sala cheia, expirada ou que não existe. */
export function SalaIndisponivel({ motivo }: { motivo: Motivo }) {
  const { titulo, texto } = TEXTOS[motivo];
  return (
    <section aria-labelledby="sala-indisponivel" className="flex flex-col items-start gap-4 py-8">
      <h1 id="sala-indisponivel" className="text-3xl tracking-tight text-balance">
        {titulo}
      </h1>
      <p className="text-muted-foreground">{texto}</p>
      <Link href={ROTA_NOITE} className={buttonVariants({ size: "lg" })}>
        Escolher sozinho
      </Link>
    </section>
  );
}
