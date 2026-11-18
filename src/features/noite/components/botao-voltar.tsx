"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * "Voltar" do wizard: a tela anterior é a entrada anterior do histórico, porque cada
 * resposta é uma URL. Quem abriu `/noite` direto não tem para onde voltar e vai ao início.
 */
export function BotaoVoltar() {
  const router = useRouter();

  function voltar() {
    if (window.history.length > 1) router.back();
    else router.push("/dashboard");
  }

  return (
    <button
      type="button"
      onClick={voltar}
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm outline-none focus-visible:ring-3"
    >
      <ArrowLeft className="size-4" aria-hidden="true" /> Voltar
    </button>
  );
}
