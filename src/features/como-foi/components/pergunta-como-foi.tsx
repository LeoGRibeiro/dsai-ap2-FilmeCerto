"use client";

import { EyeOff, Heart, ThumbsDown, ThumbsUp, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { exibirComoFoi, responderComoFoi } from "@/features/como-foi/actions";
import { caminhoMidia } from "@/lib/midia";
import type { PerguntaComoFoi as Pergunta } from "@/features/como-foi/consultas";
import type { RESPOSTAS_COMO_FOI } from "@/features/metricas/eventos";
import { ROTULOS_REACAO } from "@/features/reacoes/opcoes";

type Resposta = (typeof RESPOSTAS_COMO_FOI)[number];

/** Na ordem do pedido do cliente (3.3). */
const OPCOES: [Resposta, string, LucideIcon][] = [
  ["amei", ROTULOS_REACAO.amei, Heart],
  ["gostei", ROTULOS_REACAO.gostei, ThumbsUp],
  ["nao-gostei", ROTULOS_REACAO["nao-gostei"], ThumbsDown],
  ["nao-vi", "Não cheguei a ver", EyeOff],
];

/**
 * Cartão "Como foi {título}?" do dashboard. Conta a exibição uma vez ao aparecer; cada
 * resposta é um formulário (funciona sem JS). "Agora não" só esconde o cartão.
 */
export function PerguntaComoFoi({ pergunta }: { pergunta: Pergunta }) {
  const [estado, formAction, enviando] = useActionState(responderComoFoi, {});
  const [fechada, setFechada] = useState(false);
  const contada = useRef(false);

  useEffect(() => {
    if (contada.current) return;
    contada.current = true;
    void exibirComoFoi(pergunta.id);
  }, [pergunta.id]);

  if (fechada) return null;

  return (
    <aside
      aria-labelledby="como-foi-titulo"
      className="border-border bg-card flex flex-col gap-4 rounded-xl border p-5"
    >
      <h2 id="como-foi-titulo" className="text-xl tracking-tight">
        Como foi{" "}
        <Link href={caminhoMidia(pergunta)} className="underline-offset-4 hover:underline">
          {pergunta.titulo}
        </Link>
        ?
      </h2>
      <div role="group" aria-label="Como foi?" className="flex flex-wrap gap-2">
        {OPCOES.map(([resposta, rotulo, Icone]) => (
          <form key={resposta} action={formAction}>
            <input type="hidden" name="id" value={pergunta.id} />
            <input type="hidden" name="resposta" value={resposta} />
            <button
              type="submit"
              disabled={enviando}
              className="border-border bg-background/60 hover:bg-muted focus-visible:ring-ring/50 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors outline-none focus-visible:ring-3 disabled:opacity-70"
            >
              <Icone className="size-4" aria-hidden="true" />
              {rotulo}
            </button>
          </form>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        {estado.mensagem ? (
          <p role="alert" className="text-destructive text-sm">
            {estado.mensagem}
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setFechada(true)}
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          Agora não
        </button>
      </div>
    </aside>
  );
}
