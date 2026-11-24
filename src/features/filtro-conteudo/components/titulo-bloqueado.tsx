import { ShieldBan } from "lucide-react";
import Link from "next/link";

import { Voltar } from "@/features/filme/components/pagina-titulo";

/** Título da aba de uma página bloqueada: não diz qual é o título. */
export const TITULO_BLOQUEADO = "Título indisponível";

/**
 * Página de um título +18 com o filtro ligado. Não recebe nada do título: nem nome, nem imagem,
 * nem trailer, para nada dele chegar ao navegador.
 */
export function TituloBloqueado() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8">
      <Voltar />
      <section
        data-testid="titulo-bloqueado"
        className="border-border bg-card mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border p-8 text-center"
      >
        <ShieldBan className="text-muted-foreground size-10" aria-hidden="true" />
        <h1 className="text-3xl tracking-tight">{TITULO_BLOQUEADO}</h1>
        <p className="text-muted-foreground">
          Este título não está disponível com o filtro por idade desta conta.
        </p>
        <Link
          href="/perfil#conteudo-sensivel"
          className="border-border hover:bg-muted inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium"
        >
          Mudar o filtro no perfil
        </Link>
      </section>
    </div>
  );
}
