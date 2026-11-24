import Image from "next/image";

import { LinkComIntencao } from "@/components/link-com-intencao";
import { tituloComAno } from "@/features/filme/formatar";
import { caminhoMidia, type TipoMidia } from "@/lib/midia";
import { urlImagem } from "@/lib/tmdb/imagens";
import type { FilmeResumo } from "@/lib/tmdb/tipos";

export type FilmeCartao = Pick<FilmeResumo, "id" | "titulo" | "posterPath" | "ano"> & {
  /** Série leva para `/serie/{id}` e diz "Série"; sem tipo, é filme. */
  tipo?: TipoMidia;
  nota?: number;
  /** Só quando o filme veio do motor de recomendação. */
  motivo?: string;
};

export function CartaoFilme({ filme }: { filme: FilmeCartao }) {
  const poster = urlImagem(filme.posterPath, "w342");
  const nome = tituloComAno(filme);
  const tipo = filme.tipo ?? "filme";
  const detalhes = [
    tipo === "serie" && "Série",
    filme.ano,
    filme.nota !== undefined && `★ ${filme.nota.toFixed(1)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    // Os cartões aparecem às dezenas: só pré-carregam com intenção (ver LinkComIntencao).
    <LinkComIntencao
      href={caminhoMidia({ tipo, tmdbId: filme.id })}
      aria-label={tipo === "serie" ? `${nome}, série` : nome}
      className="group focus-visible:ring-ring/50 flex w-40 flex-col gap-2 rounded-lg outline-none focus-visible:ring-3 md:w-44"
    >
      <div className="bg-muted relative aspect-[2/3] overflow-hidden rounded-lg">
        {poster ? (
          <Image
            src={poster}
            alt=""
            fill
            sizes="(min-width: 768px) 176px, 160px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            data-testid="sem-poster"
            className="text-muted-foreground flex h-full items-center justify-center p-3 text-center text-sm font-medium"
          >
            {filme.titulo}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="truncate text-sm font-medium">{filme.titulo}</p>
        <p className="text-muted-foreground text-xs">{detalhes}</p>
        {filme.motivo && (
          <p data-testid="motivo" className="text-muted-foreground line-clamp-2 text-xs">
            {filme.motivo}
          </p>
        )}
      </div>
    </LinkComIntencao>
  );
}
