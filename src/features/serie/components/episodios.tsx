import Image from "next/image";

import { detalhesDoEpisodio } from "@/features/serie/temporada";
import { urlImagem } from "@/lib/tmdb/imagens";
import type { Episodio } from "@/lib/tmdb/tipos";

/**
 * Uma linha por episódio: imagem (sem ela, o número), "{n}. {nome}", duração, data e nota, e a
 * sinopse em até 3 linhas. No celular, a imagem fica acima do texto.
 */
export function Episodios({ episodios, hoje }: { episodios: Episodio[]; hoje: string }) {
  return (
    <ol className="divide-border/60 flex max-w-3xl flex-col divide-y">
      {episodios.map((episodio) => {
        const imagem = urlImagem(episodio.stillPath, "w300");
        const detalhes = detalhesDoEpisodio(episodio, hoje);
        return (
          <li key={episodio.numero} className="flex flex-col gap-3 py-4 sm:flex-row sm:gap-4">
            <div className="bg-muted relative aspect-video w-full shrink-0 overflow-hidden rounded-md sm:w-48">
              {imagem ? (
                <Image
                  src={imagem}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 192px, 100vw"
                  className="object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="text-muted-foreground flex h-full items-center justify-center text-2xl font-semibold"
                >
                  {episodio.numero}
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-medium">{`${episodio.numero}. ${episodio.nome}`}</p>
              {detalhes && <p className="text-muted-foreground text-sm">{detalhes}</p>}
              {episodio.sinopse && (
                <p className="line-clamp-3 text-sm leading-relaxed">{episodio.sinopse}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
