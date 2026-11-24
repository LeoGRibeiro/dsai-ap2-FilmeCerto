"use client";

import { cn } from "cn";
import { Bell, BellRing } from "lucide-react";
import { useActionState, useState } from "react";

import { alternarAcompanhamento } from "@/features/serie/actions";

export function BotaoAcompanhar({
  tmdbId,
  atual,
}: {
  tmdbId: number;
  atual: boolean;
}) {
  const [estado, formAction, enviando] = useActionState(alternarAcompanhamento, {});
  const [palpite, setPalpite] = useState(atual);
  const exibido = enviando ? palpite : atual;
  const Icone = exibido ? BellRing : Bell;

  return (
    <div className="flex flex-col gap-2">
      <form
        action={formAction}
        onSubmit={() => setPalpite(!atual)}
      >
        <input type="hidden" name="tmdbId" value={tmdbId} />
        <input type="hidden" name="acompanhar" value={!atual ? "true" : "false"} />
        <button
          type="submit"
          aria-pressed={exibido}
          disabled={enviando}
          className={cn(
            "border-border bg-background/60 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors outline-none",
            "hover:bg-muted focus-visible:ring-ring/50 focus-visible:ring-3 disabled:opacity-70",
            exibido &&
              "border-foreground bg-foreground text-background hover:bg-foreground/80",
          )}
        >
          <Icone className="size-4" />
          {exibido ? "Acompanhando" : "Avisar sobre novos episódios"}
        </button>
      </form>
      {estado.mensagem && (
        <p role="alert" className="text-destructive text-sm">
          {estado.mensagem}
        </p>
      )}
    </div>
  );
}

