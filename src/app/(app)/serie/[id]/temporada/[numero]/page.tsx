import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { Cabecalho } from "@/features/filme/components/cabecalho-filme";
import { Secao, Voltar } from "@/features/filme/components/pagina-titulo";
import { lerId } from "@/features/filme/ler-id";
import { AvisoClassificacao } from "@/features/filtro-conteudo/components/aviso-classificacao";
import {
  TITULO_BLOQUEADO,
  TituloBloqueado,
} from "@/features/filtro-conteudo/components/titulo-bloqueado";
import { obterFiltro } from "@/features/filtro-conteudo/consultas";
import { bloqueado, tratamento } from "@/features/filtro-conteudo/regras";
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
  const [dados, filtro] = await Promise.all([buscar(id, numero), obterFiltro()]);
  if (!dados) return { title: "Temporada não encontrada" };
  if (bloqueado(dados.serie.classificacao, filtro)) return { title: TITULO_BLOQUEADO };
  return { title: `${dados.serie.titulo}: ${dados.temporada.nome}` };
}

const classeLink = "text-muted-foreground hover:text-foreground inline-flex items-center gap-1";

export default async function TemporadaPage({ params }: Props) {
  const { id, numero } = await params;
  const [dados, filtro] = await Promise.all([buscar(id, numero), obterFiltro()]);
  if (!dados) notFound();
  const { serie, temporada } = dados;
  // A classificação é da série: a temporada de uma série +18 também é bloqueada.
  const comoMostrar = tratamento(serie.classificacao, filtro);
  if (comoMostrar === "bloqueado") return <TituloBloqueado />;
  const hoje = diaEmSaoPaulo(new Date());
  const { anterior, proxima } = vizinhas(serie.temporadas, temporada.numero);
  const href = (n: number) => `/serie/${serie.id}/temporada/${n}`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-8">
      <Voltar href={`/serie/${serie.id}`} rotulo={serie.titulo} />

      {comoMostrar === "aviso" && <AvisoClassificacao classificacao={serie.classificacao} />}

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
          classificacao={serie.classificacao}
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
