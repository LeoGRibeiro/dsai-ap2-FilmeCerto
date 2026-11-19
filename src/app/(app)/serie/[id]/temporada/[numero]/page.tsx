import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { Cabecalho } from "@/features/filme/components/cabecalho-filme";
import { Secao, Voltar } from "@/features/filme/components/pagina-titulo";
import { lerId } from "@/features/filme/ler-id";
import { diaEmSaoPaulo } from "@/features/recomendacao/semente";
import { Episodios } from "@/features/serie/components/episodios";
import { contar } from "@/features/serie/formatar";
import { tempoDaTemporada, vizinhas } from "@/features/serie/temporada";
import { obterSerie, obterTemporada } from "@/lib/tmdb/series";

/** A 0 (especiais) fica de fora, como na página da série. */
const MAX_TEMPORADA = 999;

/** Série e temporada numa busca por renderização, compartilhada com o título da aba. */
const buscar = cache(async (id: string, numero: string) => {
  const serieId = lerId(id);
  const temporadaNumero = lerId(numero, MAX_TEMPORADA);
  if (!serieId || !temporadaNumero) return null;
  const [serie, temporada] = await Promise.all([
    obterSerie(serieId),
    obterTemporada(serieId, temporadaNumero),
  ]);
  return serie && temporada ? { serie, temporada } : null;
});

type Props = PageProps<"/serie/[id]/temporada/[numero]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, numero } = await params;
  const dados = await buscar(id, numero);
  return {
    title: dados ? `${dados.serie.titulo}: ${dados.temporada.nome}` : "Temporada não encontrada",
  };
}

const classeLink = "text-muted-foreground hover:text-foreground inline-flex items-center gap-1";

export default async function TemporadaPage({ params }: Props) {
  const { id, numero } = await params;
  const dados = await buscar(id, numero);
  if (!dados) notFound();
  const { serie, temporada } = dados;
  const hoje = diaEmSaoPaulo(new Date());
  const { anterior, proxima } = vizinhas(serie.temporadas, temporada.numero);
  const href = (n: number) => `/serie/${serie.id}/temporada/${n}`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-8">
      <Voltar href={`/serie/${serie.id}`} rotulo={serie.titulo} />

      <div className="flex flex-col gap-4">
        <Cabecalho
          titulo={{
            titulo: temporada.nome,
            tituloOriginal: "",
            posterPath: temporada.posterPath ?? serie.posterPath,
            backdropPath: serie.backdropPath,
            generos: [],
            slogan: null,
          }}
          dados={[
            serie.titulo,
            temporada.ano ? String(temporada.ano) : null,
            contar(temporada.episodios.length, "episódio", "episódios"),
            tempoDaTemporada(temporada.episodios, serie.duracaoEpisodioMin, hoje),
          ]}
        />
        {temporada.sinopse && <p className="max-w-3xl leading-relaxed">{temporada.sinopse}</p>}
      </div>

      {temporada.episodios.length > 0 && (
        <Secao titulo="Episódios">
          <Episodios episodios={temporada.episodios} hoje={hoje} />
        </Secao>
      )}

      {(anterior || proxima) && (
        <nav aria-label="Outras temporadas" className="flex flex-wrap justify-between gap-4">
          {anterior && (
            <Link href={href(anterior.numero)} className={classeLink}>
              <ArrowLeft className="size-4" aria-hidden="true" /> Temporada anterior
            </Link>
          )}
          {proxima && (
            <Link href={href(proxima.numero)} className={`${classeLink} ml-auto`}>
              Próxima temporada <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
