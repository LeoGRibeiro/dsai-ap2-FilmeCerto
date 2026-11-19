import Image from "next/image";

import { contar } from "@/features/serie/formatar";
import { urlImagem } from "@/lib/tmdb/imagens";
import type { Temporada } from "@/lib/tmdb/tipos";

/** Uma linha por temporada: pôster pequeno (sem ele, o número), nome, ano e episódios. */
export function Temporadas({ temporadas }: { temporadas: Temporada[] }) {
  return (
    <ul className="divide-border/60 flex max-w-3xl flex-col divide-y">
      {temporadas.map((temporada) => {
        const poster = urlImagem(temporada.posterPath, "w92");
        const detalhes = [temporada.ano, contar(temporada.episodios, "episódio", "episódios")]
          .filter(Boolean)
          .join(" · ");
        return (
          <li key={temporada.numero} className="flex items-center gap-4 py-3">
            <div className="bg-muted relative aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-md">
              {poster ? (
                <Image src={poster} alt="" fill sizes="48px" className="object-cover" />
              ) : (
                <span
                  aria-hidden="true"
                  className="text-muted-foreground flex h-full items-center justify-center text-sm font-semibold"
                >
                  {temporada.numero}
                </span>
              )}
            </div>
            <div>
              <p className="font-medium">{temporada.nome}</p>
              <p className="text-muted-foreground text-sm">{detalhes}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
