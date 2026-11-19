"use client";

import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { montarSala } from "@/features/noite/actions-sala";

/**
 * As duas pessoas responderam: monta a sugestão uma vez e recarrega a página para mostrá-la.
 * Se o TMDB ou o banco falharem, mostra o porquê e "Tentar de novo".
 */
export function MontarSala({ sala }: { sala: string }) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<string>();
  const [tentativa, setTentativa] = useState(0);
  const feita = useRef(-1);

  useEffect(() => {
    // Uma chamada por tentativa, mesmo com o efeito rodando duas vezes em desenvolvimento.
    if (feita.current === tentativa) return;
    feita.current = tentativa;
    void montarSala(sala).then((resultado) => {
      if (resultado.ok) router.refresh();
      else setMensagem(resultado.mensagem);
    });
  }, [router, sala, tentativa]);

  if (mensagem) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="alert" className="text-lg">
          {mensagem}
        </p>
        <Button
          size="lg"
          onClick={() => {
            setMensagem(undefined);
            setTentativa((n) => n + 1);
          }}
        >
          <RotateCw aria-hidden="true" />
          Tentar de novo
        </Button>
      </div>
    );
  }

  return (
    <p role="status" className="text-muted-foreground">
      Procurando um filme para os dois…
    </p>
  );
}
