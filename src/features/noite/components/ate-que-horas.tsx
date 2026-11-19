"use client";

import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { aCadaMeioMinuto } from "@/features/noite/components/termina-as";
import { comHorario, comJanela, urlDaNoite, type EstadoNoite } from "@/features/noite/estado";
import { JANELAS_MIN, rotuloJanela } from "@/features/noite/opcoes";
import { ateAs, DIA_MIN, lerHorario, minutosAte } from "@/features/noite/termina";

/** Diferença, em minutos, a partir da qual o `tempo` do "Outro horário" na URL está velho. */
const TOLERANCIA_MIN = 5;

/** O minuto do dia no relógio do navegador: um número, para o `useSyncExternalStore`. */
function minutoAgora() {
  const agora = new Date();
  return agora.getHours() * 60 + agora.getMinutes();
}

/** "22:15" para o valor inicial do seletor de horário. */
function paraCampo(minutoDoDia: number) {
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${dois(Math.floor(minutoDoDia / 60))}:${dois(minutoDoDia % 60)}`;
}

function Opcao({
  marcado,
  detalhe,
  onClick,
  children,
}: {
  marcado: boolean;
  detalhe?: string | null;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      variant={marcado ? "default" : "outline"}
      aria-pressed={marcado}
      className="h-auto min-h-10 flex-col gap-0 px-3 py-1 text-sm"
      onClick={onClick}
    >
      {children}
      {detalhe && (
        <>
          {" "}
          <span className="text-xs font-normal opacity-80">{detalhe}</span>
        </>
      )}
    </Button>
  );
}

/**
 * "Até que horas?" no resultado do wizard (SPEC/2026-11-19-noite-tempo-disponivel.md): opcional,
 * com "Tanto faz" marcado. Oferece tempo a partir de agora (1h30 a 3h, com o horário de término)
 * e um "Outro horário" com seletor. Os minutos são calculados aqui, no relógio e no fuso do
 * navegador, e vão na URL; o servidor (em UTC) nunca lê o relógio para isso.
 */
export function AteQueHoras({ estado }: { estado: EstadoNoite }) {
  const router = useRouter();
  const { ate, tempo } = estado;
  const [aberto, setAberto] = useState(ate !== null);
  // No servidor, `null`: os botões mostram só "2h", e o "até as 18h06" chega com o navegador.
  const agora = useSyncExternalStore(aCadaMeioMinuto, minutoAgora, () => null);

  // "Outro horário" numa URL velha (recarregada mais tarde, aberta em outro dia): refaz a conta.
  useEffect(() => {
    if (ate === null || tempo === null) return;
    const agora = new Date();
    if (Math.abs(minutosAte(ate, agora) - tempo) <= TOLERANCIA_MIN) return;
    router.replace(urlDaNoite(comHorario(estado, ate, agora)));
  }, [ate, tempo, estado, router]);

  const ir = (proximo: EstadoNoite) => {
    const url = urlDaNoite(proximo);
    if (url !== urlDaNoite(estado)) router.push(url);
  };

  const usarHorario = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const valor = new FormData(evento.currentTarget).get("horario");
    const minutoDoDia = lerHorario(typeof valor === "string" ? valor : "");
    if (minutoDoDia !== null) ir(comHorario(estado, minutoDoDia, new Date()));
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-labelledby="ate-que-horas"
        className="flex flex-wrap items-center gap-2"
      >
        <p
          id="ate-que-horas"
          className="text-muted-foreground flex w-full items-center gap-1.5 text-sm sm:mr-1 sm:w-auto"
        >
          <Clock className="size-4" aria-hidden="true" />
          Até que horas?
        </p>
        <Opcao marcado={tempo === null} onClick={() => ir(comJanela(estado, null))}>
          Tanto faz
        </Opcao>
        {JANELAS_MIN.map((janela) => (
          <Opcao
            key={janela}
            marcado={ate === null && tempo === janela}
            detalhe={agora === null ? null : ateAs((agora + janela) % DIA_MIN)}
            onClick={() => ir(comJanela(estado, janela))}
          >
            {rotuloJanela(janela)}
          </Opcao>
        ))}
        <Opcao
          marcado={ate !== null}
          detalhe={ate === null ? null : ateAs(ate)}
          onClick={() => setAberto((valor) => !valor)}
        >
          Outro horário
        </Opcao>
      </div>
      {aberto && (
        <form onSubmit={usarHorario} className="flex items-center gap-2">
          <label htmlFor="horario-noite" className="text-sm">
            Horário
          </label>
          <input
            id="horario-noite"
            name="horario"
            type="time"
            required
            defaultValue={ate === null ? "" : paraCampo(ate)}
            className="border-input bg-background h-10 rounded-md border px-3 text-sm"
          />
          <Button type="submit" className="h-10 px-4 text-sm">
            Usar
          </Button>
        </form>
      )}
    </div>
  );
}
