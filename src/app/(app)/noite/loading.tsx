import { Bloco, EsqueletoPagina } from "@/components/layout/esqueleto";

/** Wizard carregando entre uma resposta e outra: a pergunta e os cartões de resposta. */
export default function CarregandoNoite() {
  return (
    <EsqueletoPagina className="max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <Bloco className="h-9 w-24 rounded-lg" />
        <Bloco className="h-4 w-12" />
      </div>
      <Bloco className="h-9 w-3/4 sm:h-10" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Bloco key={i} className="min-h-24 rounded-xl" />
        ))}
      </div>
    </EsqueletoPagina>
  );
}
