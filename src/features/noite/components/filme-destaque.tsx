import { cn } from "cn";
import Image from "next/image";
import type { ReactNode } from "react";

import { formatarDuracao } from "@/features/filme/formatar";
import { Trailer } from "@/features/filme/components/trailer";
import { TerminaAs } from "@/features/noite/components/termina-as";
import type { TipoMidia } from "@/lib/midia";
import { urlImagem } from "@/lib/tmdb/imagens";
import type { Provedor } from "@/lib/tmdb/tipos";

/**
 * O que a tela do resultado mostra de cada filme ou série (só o necessário vai para o navegador).
 * Na série, `duracaoMin` é a do episódio.
 */
export type FilmeNaTela = {
  /** Filme quando falta. */
  tipo?: TipoMidia;
  id: number;
  titulo: string;
  ano: number | null;
  posterPath: string | null;
  sinopse: string;
  duracaoMin: number | null;
  trailerYoutube: string | null;
  motivo: string;
  provedor: Provedor | null;
};

/** "2019 · 1h52" (série: "2019 · Episódios de ~45 min"), sem as partes que faltam. */
export function anoEDuracao(filme: Pick<FilmeNaTela, "tipo" | "ano" | "duracaoMin">): string {
  const { tipo, duracaoMin } = filme;
  const duracao =
    tipo === "serie"
      ? duracaoMin && `Episódios de ~${duracaoMin} min`
      : formatarDuracao(duracaoMin);
  return [filme.ano, duracao].filter(Boolean).join(" · ");
}

export function PosterNoite({ filme, className }: { filme: FilmeNaTela; className: string }) {
  const poster = urlImagem(filme.posterPath, "w342");
  return (
    <div
      className={cn(
        "bg-muted relative aspect-[2/3] shrink-0 overflow-hidden rounded-lg",
        className,
      )}
    >
      {poster ? (
        <Image src={poster} alt="" fill sizes="176px" className="object-cover" />
      ) : (
        <div className="text-muted-foreground flex h-full items-center justify-center p-2 text-center text-xs font-medium">
          {filme.titulo}
        </div>
      )}
    </div>
  );
}

/**
 * O filme (ou a série) da noite, em destaque: pôster, título, ano e duração, onde assistir, "termina às",
 * o motivo ligado às respostas, a sinopse curta e o trailer. `acoes` são os botões da escolha.
 */
export function FilmeDestaque({ filme, acoes }: { filme: FilmeNaTela; acoes?: ReactNode }) {
  return (
    <article aria-labelledby="titulo-noite" className="flex flex-col gap-5">
      <p className="text-primary text-sm font-medium tracking-wide uppercase">
        {filme.tipo === "serie" ? "A série da sua noite" : "O filme da sua noite"}
      </p>
      <div className="flex gap-4 sm:gap-6">
        <PosterNoite filme={filme} className="w-28 shadow-xl sm:w-44" />
        <div className="flex min-w-0 flex-col gap-2">
          <h1
            id="titulo-noite"
            className="text-2xl leading-tight tracking-tight text-balance break-words sm:text-4xl"
          >
            {filme.titulo}
          </h1>
          <p className="text-muted-foreground text-sm">{anoEDuracao(filme)}</p>
          {filme.provedor && <p className="text-sm">Onde assistir: {filme.provedor.nome}</p>}
          {filme.duracaoMin && (
            <TerminaAs duracaoMin={filme.duracaoMin} episodio={filme.tipo === "serie"} />
          )}
        </div>
      </div>
      <p data-testid="motivo-noite" className="border-primary border-l-4 pl-3 font-medium">
        {filme.motivo}
      </p>
      {filme.sinopse && <p className="text-muted-foreground line-clamp-3">{filme.sinopse}</p>}
      {acoes}
      {filme.trailerYoutube && (
        <Trailer chave={filme.trailerYoutube} titulo={filme.titulo} origem="noite" />
      )}
    </article>
  );
}
