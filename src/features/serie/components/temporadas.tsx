import Image from "next/image";
import Link from "next/link";

import { contar } from "@/features/serie/formatar";
import { cercaDe } from "@/features/serie/temporada";
import { urlImagem } from "@/lib/tmdb/imagens";
import type { Temporada } from "@/lib/tmdb/tipos";

/**
 * Uma linha por temporada, com link para os episódios: pôster pequeno (sem ele, o número), nome,
 * ano, episódios e o tempo aproximado (episódios × duração do episódio da série).
 */
export function Temporadas({
  serieId,
  temporadas,
  duracaoEpisodioMin,
}: {
  serieId: number;
  temporadas: Temporada[];
  duracaoEpisodioMin: number | null;
}) {
  return (
    <ul className="divide-border/60 flex max-w-3xl flex-col divide-y">
      {temporadas.map((temporada) => {
        const poster = urlImagem(temporada.posterPath, "w92");
        const detalhes = [
          temporada.ano,
          contar(temporada.episodios, "episódio", "episódios"),
          duracaoEpisodioMin && cercaDe(temporada.episodios * duracaoEpisodioMin),
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <li key={temporada.numero}>
            <Link
              href={`/serie/${serieId}/temporada/${temporada.numero}`}
              className="hover:bg-muted/50 flex items-center gap-4 rounded-md px-2 py-3"
            >
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
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
