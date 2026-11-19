"use client";

import { Copy, Share2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { linkWhatsApp } from "@/features/noite/compartilhar";
import { rotaDaSala } from "@/features/noite/estado";

const ESTILO = "h-12 px-6 text-base";
const CONVITE = "Vamos escolher o filme de hoje juntos? Responde aqui:";

const semMudancas = () => () => {};

/**
 * O link da sala para a outra pessoa: "Copiar link" e "Enviar no WhatsApp". O endereço vem
 * da origem em que o app está aberto (produção, prévia ou E2E). Se a cópia falhar, o link
 * continua visível para copiar à mão.
 */
export function LinkSala({ sala }: { sala: string }) {
  const origem = useSyncExternalStore(
    semMudancas,
    () => window.location.origin,
    () => null,
  );
  const [copia, setCopia] = useState<"ok" | "falhou">();
  if (origem === null) return null;

  const url = `${origem}${rotaDaSala(sala)}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopia("ok");
    } catch {
      setCopia("falhou");
    }
  }

  return (
    <section
      aria-labelledby="link-sala"
      className="bg-card flex flex-col gap-3 rounded-xl border p-4"
    >
      <h2 id="link-sala" className="text-lg font-medium">
        Mande o link para a outra pessoa
      </h2>
      <input
        readOnly
        aria-label="Link da sala"
        value={url}
        onFocus={(evento) => evento.currentTarget.select()}
        className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" className={ESTILO} onClick={copiar}>
          <Copy aria-hidden="true" />
          Copiar link
        </Button>
        <a
          href={linkWhatsApp(CONVITE, url)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", size: "lg", className: ESTILO })}
        >
          <Share2 aria-hidden="true" />
          Enviar no WhatsApp
        </a>
      </div>
      {copia && (
        <p role="status" className="text-sm">
          {copia === "ok" ? "Link copiado!" : "Não deu para copiar. Selecione o link acima."}
        </p>
      )}
    </section>
  );
}
