"use client";

import { Users } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { criarSala } from "@/features/noite/actions-sala";

/**
 * "Vamos escolher juntos", na primeira pergunta do wizard: cria a sala da "Noite a dois"
 * e leva a ela (SPEC/2026-11-18-noite-a-dois.md).
 */
export function JuntosBotao() {
  const [mensagem, setMensagem] = useState<string>();
  const [criando, iniciar] = useTransition();

  function criar() {
    iniciar(async () => {
      const resultado = await criarSala();
      setMensagem(resultado?.mensagem);
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant="outline"
        size="lg"
        className="h-12 px-6 text-base"
        onClick={criar}
        disabled={criando}
      >
        <Users aria-hidden="true" />
        Vamos escolher juntos
      </Button>
      <p className="text-muted-foreground text-sm">
        Cada um responde no próprio celular, e o app sugere um filme para os dois.
      </p>
      {mensagem && (
        <p role="alert" className="text-destructive text-sm">
          {mensagem}
        </p>
      )}
    </div>
  );
}
