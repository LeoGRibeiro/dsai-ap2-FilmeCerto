import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Cabecalho } from "@/features/filme/components/cabecalho-filme";
import { Elenco } from "@/features/filme/components/elenco";
import { OndeAssistir } from "@/features/filme/components/onde-assistir";
import { AcoesTitulo, Secao, Sinopse, Voltar } from "@/features/filme/components/pagina-titulo";
import { Trailer } from "@/features/filme/components/trailer";
import { tituloComAno } from "@/features/filme/formatar";
import { buscaPorId } from "@/features/filme/ler-id";
import { obterStatusLista } from "@/features/listas/consultas";
import { obterReacao } from "@/features/reacoes/consultas";
import { Temporadas } from "@/features/serie/components/temporadas";
import { dadosDaSerie } from "@/features/serie/formatar";
import type { Midia } from "@/lib/midia";
import { obterSerie } from "@/lib/tmdb/series";

const buscarSerie = buscaPorId(obterSerie);

export async function generateMetadata({ params }: PageProps<"/serie/[id]">): Promise<Metadata> {
  const serie = await buscarSerie((await params).id);
  return { title: serie ? tituloComAno(serie) : "Série não encontrada" };
}

export default async function SeriePage({ params }: PageProps<"/serie/[id]">) {
  const serie = await buscarSerie((await params).id);
  if (!serie) notFound();
  const midia: Midia = { tipo: "serie", tmdbId: serie.id };
  const [reacao, statusLista] = await Promise.all([obterReacao(midia), obterStatusLista(midia)]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-8">
      <Voltar />

      <Cabecalho
        titulo={serie}
        dados={dadosDaSerie(serie)}
        acoes={<AcoesTitulo midia={midia} reacao={reacao} statusLista={statusLista} />}
      />

      <Sinopse texto={serie.sinopse} rotulo="Criação" nomes={serie.criacao} />

      {/* Sem `origem`: a origem "serie" do trailer_aberto fica para depois (spec series-pagina). */}
      {serie.trailerYoutube && (
        <Secao titulo="Trailer">
          <Trailer chave={serie.trailerYoutube} titulo={serie.titulo} />
        </Secao>
      )}

      {serie.temporadas.length > 0 && (
        <Secao titulo="Temporadas">
          <Temporadas temporadas={serie.temporadas} />
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
