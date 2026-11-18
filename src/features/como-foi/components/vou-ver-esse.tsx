"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { escolherFilme } from "@/features/como-foi/actions";
import { enviarEvento } from "@/features/metricas/enviar";

/**
 * "Vou ver esse!" do resultado do wizard: guarda a escolha para o "Como foi?"
 * (SPEC/2026-11-18-como-foi.md) e registra `wizard_escolheu` com as trocas feitas.
 */
export function VouVerEsse({
  tmdbId,
  titulo,
  trocas,
  aoEscolher,
}: {
  tmdbId: number;
  titulo: string;
  trocas: number;
  /** Avisa a tela do wizard, por exemplo para não registrar `wizard_abandonado`. */
  aoEscolher?: () => void;
}) {
  const [escolhido, setEscolhido] = useState(false);
  const [mensagem, setMensagem] = useState<string>();
  const [enviando, iniciar] = useTransition();

  function escolher() {
    iniciar(async () => {
      const resultado = await escolherFilme(tmdbId);
      if (resultado.mensagem) {
        setMensagem(resultado.mensagem);
        return;
      }
      enviarEvento({ nome: "wizard_escolheu", dados: { trocas } });
      setEscolhido(true);
      aoEscolher?.();
    });
  }

  if (escolhido) {
    return (
      <div role="status" className="flex flex-col gap-1">
        <p className="flex items-center gap-2 font-medium">
          <Check className="size-4" aria-hidden="true" />
          Boa sessão! Na próxima visita, a gente pergunta como foi.
        </p>
        <Link
          href={`/filme/${tmdbId}`}
          className="text-primary text-sm underline-offset-4 hover:underline"
        >
          Ver detalhes de {titulo}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button size="lg" onClick={escolher} disabled={enviando}>
        Vou ver esse!
      </Button>
      {mensagem && (
        <p role="alert" className="text-destructive text-sm">
          {mensagem}
        </p>
      )}
    </div>
  );
}
