import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Carrossel } from "@/features/dashboard/components/carrossel";
import { CartaoFilme } from "@/features/dashboard/components/cartao-filme";
import { CabecalhoFilme } from "@/features/filme/components/cabecalho-filme";
import { Elenco } from "@/features/filme/components/elenco";
import { OndeAssistir } from "@/features/filme/components/onde-assistir";
import {
  AcoesTitulo,
  Secao,
  Sinopse,
  Voltar,
} from "@/features/filme/components/pagina-titulo";
import { Trailer } from "@/features/filme/components/trailer";
import { tituloComAno } from "@/features/filme/formatar";
import { buscaPorId } from "@/features/filme/ler-id";
import { obterStatusLista } from "@/features/listas/consultas";
import { obterReacao } from "@/features/reacoes/consultas";
import { obterFilme } from "@/lib/tmdb/filmes";

const buscarFilme = buscaPorId(obterFilme);

export async function generateMetadata({ params }: PageProps<"/filme/[id]">): Promise<Metadata> {
  const filme = await buscarFilme((await params).id);
  if (!filme) return { title: "Filme não encontrado" };
  return { title: tituloComAno(filme) };
}

export default async function FilmePage({ params }: PageProps<"/filme/[id]">) {
  const filme = await buscarFilme((await params).id);
  if (!filme) notFound();
  const [reacao, statusLista] = await Promise.all([
    obterReacao(filme.id),
    obterStatusLista(filme.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-8">
      <Voltar />

      <CabecalhoFilme
        filme={filme}
        acoes={
          <AcoesTitulo
            midia={{ tipo: "filme", tmdbId: filme.id }}
            reacao={reacao}
            statusLista={statusLista}
          />
        }
      />

      <Sinopse texto={filme.sinopse} rotulo="Direção" nomes={filme.direcao} />

      {filme.trailerYoutube && (
        <Secao titulo="Trailer">
          <Trailer chave={filme.trailerYoutube} titulo={filme.titulo} origem="filme" />
        </Secao>
      )}

      <Secao titulo="Onde assistir no Brasil">
        <OndeAssistir dados={filme.ondeAssistir} />
      </Secao>

      {filme.elenco.length > 0 && (
        <Secao titulo="Elenco">
          <Elenco pessoas={filme.elenco} />
        </Secao>
      )}

      {filme.parecidos.length > 0 && (
        <section aria-labelledby="titulo-parecidos" className="flex flex-col gap-4">
          <h2 id="titulo-parecidos" className="text-2xl tracking-tight">
            Filmes parecidos
          </h2>
          <Carrossel rotulo="Filmes parecidos">
            {filme.parecidos.map((parecido) => (
              <li key={parecido.id} className="shrink-0 snap-start">
                <CartaoFilme filme={parecido} />
              </li>
            ))}
          </Carrossel>
        </section>
      )}
    </div>
  );
}
