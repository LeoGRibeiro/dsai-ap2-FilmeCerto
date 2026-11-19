"use client";

import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { comHorario, urlDaNoite, type EstadoNoite } from "@/features/noite/estado";
import { HORAS_LIMITE, ROTULOS_HORA, type HoraLimite } from "@/features/noite/opcoes";
import { minutosAte } from "@/features/noite/termina";

/** Diferença, em minutos, a partir da qual o `tempo` da URL está velho. */
const TOLERANCIA_MIN = 5;

const OPCOES: [HoraLimite | null, string][] = [
  [null, "Tanto faz"],
  ...HORAS_LIMITE.map((hora): [HoraLimite, string] => [hora, ROTULOS_HORA[hora]]),
];

/**
 * "Até que horas?" no resultado do wizard (SPEC/2026-11-18-noite-ate-que-horas.md): opcional,
 * com "Tanto faz" marcado. Os minutos até a hora são calculados aqui, no relógio e no fuso
 * do navegador, e vão na URL; o servidor (em UTC) nunca lê o relógio para isso.
 */
export function AteQueHoras({ estado }: { estado: EstadoNoite }) {
  const router = useRouter();
  const { ate, tempo } = estado;

  // URL velha (recarregada mais tarde, aberta em outro dia): refaz a conta com o relógio de agora.
  useEffect(() => {
    if (ate === null || tempo === null) return;
    const agora = new Date();
    if (Math.abs(minutosAte(ate, agora) - tempo) <= TOLERANCIA_MIN) return;
    router.replace(urlDaNoite(comHorario(estado, ate, agora)));
  }, [ate, tempo, estado, router]);

  const escolher = (hora: HoraLimite | null) => {
    if (hora !== ate) router.push(urlDaNoite(comHorario(estado, hora, new Date())));
  };

  return (
    <div role="group" aria-labelledby="ate-que-horas" className="flex flex-wrap items-center gap-2">
      <p
        id="ate-que-horas"
        className="text-muted-foreground flex w-full items-center gap-1.5 text-sm sm:mr-1 sm:w-auto"
      >
        <Clock className="size-4" aria-hidden="true" />
        Até que horas?
      </p>
      {OPCOES.map(([hora, rotulo]) => (
        <Button
          key={rotulo}
          variant={hora === ate ? "default" : "outline"}
          aria-pressed={hora === ate}
          className="h-10 px-3 text-sm"
          onClick={() => escolher(hora)}
        >
          {rotulo}
        </Button>
      ))}
    </div>
  );
}
