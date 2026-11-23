import Image from "next/image";
import type { ReactNode } from "react";

import { formatarDuracao, formatarNota } from "@/features/filme/formatar";
import { SeloClassificacao } from "@/features/filtro-conteudo/components/selo-classificacao";
import { listaDeTemas, origemDosTemas } from "@/features/filtro-conteudo/temas";
import type { TemasClassificacao } from "@/lib/tmdb/classificacao";
import { urlImagem } from "@/lib/tmdb/imagens";
import type { ClassificacaoBR, FilmeDetalhes } from "@/lib/tmdb/tipos";

/** O que o cabeçalho mostra de um filme ou de uma série. */
export type DadosCabecalho = Pick<
  FilmeDetalhes,
  "titulo" | "tituloOriginal" | "posterPath" | "backdropPath" | "generos" | "slogan"
>;

/**
 * Cabeçalho da página de um título: fundo, pôster, título, linha de dados (itens `null` são
 * omitidos) com o selo da classificação no fim, um aviso abaixo dela (o próximo episódio da
 * série), gêneros, slogan e ações.
 */
export function Cabecalho({
  titulo: filme,
  dados: itens,
  classificacao = null,
  temas = null,
  aviso,
  acoes,
}: {
  titulo: DadosCabecalho;
  dados: (string | null)[];
  classificacao?: ClassificacaoBR | null;
  /** Por que tem essa classificação: "Temas: violência, medo". */
  temas?: TemasClassificacao | null;
  aviso?: string | null;
  acoes?: ReactNode;
}) {
  const fundo = urlImagem(filme.backdropPath, "w1280");
  const poster = urlImagem(filme.posterPath, "w500");
  const dados = itens.filter((item): item is string => item !== null);

  return (
    <div className="border-border/60 bg-card relative isolate overflow-hidden rounded-2xl border">
      {fundo && (
        <Image src={fundo} alt="" fill priority sizes="100vw" className="-z-20 object-cover" />
      )}
      <div className="from-background via-background/90 to-background/40 absolute inset-0 -z-10 bg-gradient-to-t md:bg-gradient-to-r" />

      <div className="flex flex-col gap-6 p-4 sm:p-8 md:flex-row md:items-end">
        <div className="bg-muted relative aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-lg shadow-xl sm:w-52">
          {poster ? (
            <Image src={poster} alt="" fill priority sizes="208px" className="object-cover" />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center p-3 text-center font-medium">
              {filme.titulo}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-4xl leading-none tracking-tight text-balance sm:text-6xl">
              {filme.titulo}
            </h1>
            {filme.tituloOriginal && filme.tituloOriginal !== filme.titulo && (
              <p className="text-muted-foreground mt-1">{filme.tituloOriginal}</p>
            )}
          </div>
          <ul className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {dados.map((item, indice) => (
              <li key={item} className="flex items-center gap-3">
                {indice > 0 && <span aria-hidden="true">·</span>}
                <span>{item}</span>
              </li>
            ))}
            {classificacao && (
              <li className="flex items-center gap-3">
                {dados.length > 0 && <span aria-hidden="true">·</span>}
                <SeloClassificacao classificacao={classificacao} />
              </li>
            )}
          </ul>
          {temas && (
            <p data-testid="temas-classificacao" className="text-muted-foreground text-sm">
              Temas: {listaDeTemas(temas)}
              {origemDosTemas(temas) && <span className="text-xs"> ({origemDosTemas(temas)})</span>}
            </p>
          )}
          {aviso && <p className="text-sm font-medium">{aviso}</p>}
          {filme.generos.length > 0 && (
            <ul aria-label="Gêneros" className="flex flex-wrap gap-2">
              {filme.generos.map((genero) => (
                <li
                  key={genero.id}
                  className="border-border bg-background/60 rounded-full border px-3 py-1 text-xs"
                >
                  {genero.nome}
                </li>
              ))}
            </ul>
          )}
          {filme.slogan && <p className="text-muted-foreground italic">{filme.slogan}</p>}
          {/* Reações e botões de lista. */}
          <div data-testid="acoes-filme" className="flex flex-col gap-3 empty:hidden">
            {acoes}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Linha de dados do filme: ano · duração · nota · selo da classificação. */
export function CabecalhoFilme({ filme, acoes }: { filme: FilmeDetalhes; acoes?: ReactNode }) {
  return (
    <Cabecalho
      titulo={filme}
      dados={[
        filme.ano ? String(filme.ano) : null,
        formatarDuracao(filme.duracaoMin),
        formatarNota(filme.nota, filme.votos),
      ]}
      classificacao={filme.classificacao}
      temas={filme.temas}
      acoes={acoes}
    />
  );
}
