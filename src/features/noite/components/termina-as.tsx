"use client";

import { Clock } from "lucide-react";
import { useSyncExternalStore } from "react";

import { terminaAs } from "@/features/noite/termina";

/** O horário anda com o relógio: a pessoa pode ficar alguns minutos decidindo. */
function aCadaMeioMinuto(avisar: () => void) {
  const id = setInterval(avisar, 30_000);
  return () => clearInterval(id);
}

/**
 * "Começando agora, termina às 23h40", no fuso do navegador. No servidor (que roda em UTC)
 * não mostra nada; o horário aparece quando a página chega ao navegador.
 */
export function TerminaAs({ duracaoMin }: { duracaoMin: number }) {
  const hora = useSyncExternalStore(
    aCadaMeioMinuto,
    () => terminaAs(new Date(), duracaoMin),
    () => null,
  );
  if (!hora) return null;

  return (
    <p className="flex items-center gap-1.5 text-sm">
      <Clock className="size-4 shrink-0" aria-hidden="true" />
      Começando agora, termina às {hora}
    </p>
  );
}
