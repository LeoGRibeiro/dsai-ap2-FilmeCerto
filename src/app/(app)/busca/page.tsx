import type { Metadata } from "next";

import {
  AbasBusca,
  AbasTipo,
  FormularioFiltros,
  FormularioNome,
} from "@/features/busca/components/formularios-busca";
import { ResultadosBusca } from "@/features/busca/components/resultados-busca";
import {
  filtrosParaDescoberta,
  lerBusca,
  MIN_TEXTO,
  parametrosDaBusca,
} from "@/features/busca/parametros";
import { descobrirAte } from "@/features/filtro-conteudo/aplicar";
import { semBloqueadosDoTmdb } from "@/features/filtro-conteudo/classificar";
import { obterFiltro } from "@/features/filtro-conteudo/consultas";
import { limiteDaBusca } from "@/features/filtro-conteudo/regras";
import { buscarFilmes, descobrirFilmes } from "@/lib/tmdb/filmes";
import { buscarSeries } from "@/lib/tmdb/series";

export async function generateMetadata({ searchParams }: PageProps<"/busca">): Promise<Metadata> {
  const { modo, texto } = lerBusca(await searchParams);
  return {
    title: modo === "nome" && texto.length >= MIN_TEXTO ? `Busca: ${texto}` : "Buscar",
  };
}

export default async function BuscaPage({ searchParams }: PageProps<"/busca">) {
  const busca = lerBusca(await searchParams);
  const { modo, tipo, texto, pagina, filtros } = busca;
  const buscarPorNome = tipo === "serie" ? buscarSeries : buscarFilmes;
  const filtro = await obterFiltro();

  // Com filtro por idade, nada +18: a descoberta já vem filtrada pelo TMDB, e a busca por nome
  // confere título a título (a página pode vir com menos itens).
  const porNome = modo === "nome" && texto.length >= MIN_TEXTO;
  const bruto =
    modo === "filtros"
      ? await descobrirAte(
          descobrirFilmes,
          limiteDaBusca(filtro),
        )(filtrosParaDescoberta(filtros, pagina))
      : porNome
        ? await buscarPorNome(texto, pagina)
        : null;
  const resultado =
    bruto && porNome
      ? { ...bruto, itens: await semBloqueadosDoTmdb(bruto.itens, filtro, tipo) }
      : bruto;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-4xl tracking-tight">Buscar</h1>
      {/* Em telas largas, o modo de busca e os filtros ficam numa coluna à esquerda. */}
      <div className="grid gap-8 lg:grid-cols-[17rem_1fr] lg:items-start">
        <aside className="lg:bg-card flex flex-col gap-5 lg:sticky lg:top-24 lg:rounded-2xl lg:border lg:p-5">
          <AbasBusca ativa={modo} />
          {modo === "nome" ? (
            <FormularioNome texto={texto} tipo={tipo} />
          ) : (
            <>
              <h2 className="text-xl tracking-tight">Filtros</h2>
              <FormularioFiltros filtros={filtros} />
            </>
          )}
        </aside>
        <div className="flex flex-col gap-6">
          {modo === "nome" && <AbasTipo ativa={tipo} texto={texto} />}
          <ResultadosBusca
            modo={modo}
            tipo={tipo}
            texto={texto}
            resultado={resultado}
            parametros={parametrosDaBusca(busca)}
          />
        </div>
      </div>
    </div>
  );
}
