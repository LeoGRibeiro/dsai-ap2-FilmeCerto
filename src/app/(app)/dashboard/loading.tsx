import { Bloco, EsqueletoPagina } from "@/components/layout/esqueleto";
import { EsqueletoSecoes } from "@/features/dashboard/components/esqueleto-secoes";

/** Dashboard carregando: saudação, os dois botões do topo e as seções de recomendação. */
export default function CarregandoDashboard() {
  return (
    <EsqueletoPagina className="max-w-6xl gap-10 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Bloco className="h-10 w-64 sm:h-12" />
          <Bloco className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Bloco className="h-11 w-full rounded-lg sm:w-48" />
          <Bloco className="h-11 w-full rounded-lg sm:w-60" />
        </div>
      </div>
      <EsqueletoSecoes />
    </EsqueletoPagina>
  );
}
