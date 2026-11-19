"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Intervalo da atualização enquanto a outra pessoa responde (sem Realtime). */
export const INTERVALO_SALA_MS = 4000;

/** "Esperando a outra pessoa responder…": recarrega os dados da página até a sala mudar. */
export function EsperandoSala() {
  const router = useRouter();

  useEffect(() => {
    const intervalo = setInterval(() => router.refresh(), INTERVALO_SALA_MS);
    return () => clearInterval(intervalo);
  }, [router]);

  return (
    <div role="status" className="flex flex-col gap-2">
      <h1 className="text-3xl tracking-tight text-balance">Esperando a outra pessoa responder…</h1>
      <p className="text-muted-foreground">
        Suas respostas foram enviadas. Assim que a outra pessoa responder, a sugestão aparece aqui.
      </p>
    </div>
  );
}
