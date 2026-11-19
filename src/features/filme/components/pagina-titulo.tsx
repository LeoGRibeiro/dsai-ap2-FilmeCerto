import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { BotoesLista } from "@/features/listas/components/botoes-lista";
import type { StatusLista } from "@/features/listas/opcoes";
import { BotoesReacao } from "@/features/reacoes/components/botoes-reacao";
import type { Reacao } from "@/features/reacoes/opcoes";
import type { Midia } from "@/lib/midia";

/** Partes comuns às páginas de filme e de série. */

/** "← Voltar" ao dashboard; a temporada volta à série, com o nome dela. */
export function Voltar({
  href = "/dashboard",
  rotulo = "Voltar",
}: {
  href?: string;
  rotulo?: string;
}) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
    >
      <ArrowLeft className="size-4" aria-hidden="true" /> {rotulo}
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

/** Sinopse e, abaixo, quem fez ("Direção: ..." no filme, "Criação: ..." na série). */
export function Sinopse({
  texto,
  rotulo,
  nomes,
}: {
  texto: string;
  rotulo: string;
  nomes: string[];
}) {
  return (
    <Secao titulo="Sinopse">
      <p className="max-w-3xl leading-relaxed">{texto || "Sinopse não disponível em português."}</p>
      {nomes.length > 0 && (
        <p className="text-muted-foreground text-sm">
          {rotulo}: {nomes.join(", ")}
        </p>
      )}
    </Secao>
  );
}

/** Botões de reação e de lista do título; a `key` recria cada grupo quando o servidor muda o valor. */
export function AcoesTitulo({
  midia: { tipo, tmdbId },
  reacao,
  statusLista,
}: {
  midia: Midia;
  reacao: Reacao | null;
  statusLista: StatusLista | null;
}) {
  return (
    <>
      <BotoesReacao key={`r-${reacao}`} tipo={tipo} tmdbId={tmdbId} atual={reacao} />
      <BotoesLista key={`l-${statusLista}`} tipo={tipo} tmdbId={tmdbId} atual={statusLista} />
    </>
  );
}
