/** Esqueleto das seções enquanto o motor (ou o TMDB de séries) busca as recomendações. */
export function EsqueletoSecoes({ secoes = 3 }: { secoes?: number }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-10">
      <span className="sr-only">Carregando recomendações</span>
      {Array.from({ length: secoes }, (_, secao) => (
        <div key={secao} className="flex flex-col gap-3">
          <div className="bg-muted h-7 w-56 animate-pulse rounded" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }, (_, cartao) => (
              <div
                key={cartao}
                className="bg-muted aspect-[2/3] w-40 shrink-0 animate-pulse rounded-lg md:w-44"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
