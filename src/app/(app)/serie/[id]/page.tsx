import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Cabecalho } from "@/features/filme/components/cabecalho-filme";
import { Elenco } from "@/features/filme/components/elenco";
import { OndeAssistir } from "@/features/filme/components/onde-assistir";
import { AcoesTitulo, Secao, Sinopse, Voltar } from "@/features/filme/components/pagina-titulo";
import { Trailer } from "@/features/filme/components/trailer";
import { tituloComAno } from "@/features/filme/formatar";
import { buscaPorId } from "@/features/filme/ler-id";
import { AvisoClassificacao } from "@/features/filtro-conteudo/components/aviso-classificacao";
import {
  TITULO_BLOQUEADO,
  TituloBloqueado,
} from "@/features/filtro-conteudo/components/titulo-bloqueado";
import { obterFiltro } from "@/features/filtro-conteudo/consultas";
import { bloqueado, tratamento } from "@/features/filtro-conteudo/regras";
import { obterStatusLista } from "@/features/listas/consultas";
import { obterReacao } from "@/features/reacoes/consultas";
import { diaEmSaoPaulo } from "@/features/recomendacao/semente";
import { Temporadas } from "@/features/serie/components/temporadas";
import { dadosDaSerie, proximoEpisodio } from "@/features/serie/formatar";
import type { Midia } from "@/lib/midia";
import { obterSerie } from "@/lib/tmdb/series";

const buscarSerie = buscaPorId(obterSerie);

export async function generateMetadata({ params }: PageProps<"/serie/[id]">): Promise<Metadata> {
  const [serie, filtro] = await Promise.all([buscarSerie((await params).id), obterFiltro()]);
  if (!serie) return { title: "Série não encontrada" };
  if (bloqueado(serie.classificacao, filtro)) return { title: TITULO_BLOQUEADO };
  return { title: tituloComAno(serie) };
}

export default async function SeriePage({ params }: PageProps<"/serie/[id]">) {
  const [serie, filtro] = await Promise.all([buscarSerie((await params).id), obterFiltro()]);
  if (!serie) notFound();
  const comoMostrar = tratamento(serie.classificacao, filtro);
  if (comoMostrar === "bloqueado") return <TituloBloqueado />;
  const midia: Midia = { tipo: "serie", tmdbId: serie.id };
  const [reacao, statusLista] = await Promise.all([obterReacao(midia), obterStatusLista(midia)]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-8">
      <Voltar />

      {comoMostrar === "aviso" && (
        <AvisoClassificacao classificacao={serie.classificacao} temas={serie.temas} />
      )}

      <Cabecalho
        titulo={serie}
        dados={dadosDaSerie(serie)}
        classificacao={serie.classificacao}
        temas={serie.temas}
        aviso={proximoEpisodio(serie, diaEmSaoPaulo(new Date()))}
        acoes={<AcoesTitulo midia={midia} reacao={reacao} statusLista={statusLista} />}
      />

      <Sinopse texto={serie.sinopse} rotulo="Criação" nomes={serie.criacao} />

      {serie.trailerYoutube && (
        <Secao titulo="Trailer">
          <Trailer chave={serie.trailerYoutube} titulo={serie.titulo} origem="serie" />
        </Secao>
      )}

      {serie.temporadas.length > 0 && (
        <Secao titulo="Temporadas">
          <Temporadas
            serieId={serie.id}
            temporadas={serie.temporadas}
            duracaoEpisodioMin={serie.duracaoEpisodioMin}
          />
        </Secao>
      )}

      <Secao titulo="Onde assistir no Brasil">
        <OndeAssistir dados={serie.ondeAssistir} tipo="serie" />
      </Secao>

      {serie.elenco.length > 0 && (
        <Secao titulo="Elenco">
          <Elenco pessoas={serie.elenco} />
        </Secao>
      )}
    </div>
  );
}
