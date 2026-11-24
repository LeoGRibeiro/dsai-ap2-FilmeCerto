import { Bloco, EsqueletoPagina } from "@/components/layout/esqueleto";

/** Esqueleto das telas da área logada sem um próprio: busca, listas, perfil e métricas. */
export default function Carregando() {
  return (
    <EsqueletoPagina>
      <div className="flex flex-col gap-3">
        <Bloco className="h-10 w-64 max-w-full" />
        <Bloco className="h-4 w-full max-w-md" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Bloco key={i} className="aspect-[2/3] rounded-lg" />
        ))}
      </div>
    </EsqueletoPagina>
  );
}
