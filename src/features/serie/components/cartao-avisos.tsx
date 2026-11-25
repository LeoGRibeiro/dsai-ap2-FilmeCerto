"use client";

import { BellRing } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { marcarAvisoLido } from "@/features/serie/actions";
import { textoDoAviso, type AvisoEpisodio } from "@/features/serie/avisos";
import { formatarData } from "@/features/serie/temporada";

/**
 * Cartão "Episódios novos" do início (SPEC/2026-11-25-avisos-episodios.md): poucas linhas, cada
 * uma com o link para a temporada e "Marcar como lido" (um formulário por aviso, funciona sem JS).
 */
export function CartaoAvisos({ avisos }: { avisos: AvisoEpisodio[] }) {
  const [estado, formAction, enviando] = useActionState(marcarAvisoLido, {});

  return (
    <aside
      aria-labelledby="avisos-episodios-titulo"
      className="border-border bg-card flex flex-col gap-4 rounded-xl border p-5"
    >
      <h2 id="avisos-episodios-titulo" className="flex items-center gap-2 text-xl tracking-tight">
        <BellRing className="size-5" aria-hidden="true" />
        Episódios novos
      </h2>
      <ul className="flex flex-col gap-3">
        {avisos.map((aviso) => {
          const idTexto = `aviso-${aviso.id}`;
          return (
            <li
              key={aviso.id}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col">
                <p id={idTexto}>{textoDoAviso(aviso)}</p>
                <p className="text-muted-foreground text-sm">
                  Estreou em {formatarData(aviso.dataEstreia)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <Link
                  href={`/serie/${aviso.serieTmdbId}/temporada/${aviso.temporada}`}
                  aria-describedby={idTexto}
                  className="underline-offset-4 hover:underline"
                >
                  Ver temporada {aviso.temporada}
                </Link>
                <form action={formAction}>
                  <input type="hidden" name="id" value={aviso.id} />
                  <button
                    type="submit"
                    disabled={enviando}
                    aria-describedby={idTexto}
                    className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline disabled:opacity-70"
                  >
                    Marcar como lido
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
      {estado.mensagem && (
        <p role="alert" className="text-destructive text-sm">
          {estado.mensagem}
        </p>
      )}
    </aside>
  );
}
