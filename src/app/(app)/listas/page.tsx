import type { Metadata } from "next";

import { semBloqueados } from "@/features/filtro-conteudo/aplicar";
import { classificarMidia } from "@/features/filtro-conteudo/classificar";
import { obterFiltro } from "@/features/filtro-conteudo/consultas";
import { lerAba } from "@/features/listas/aba";
import { AbasListas } from "@/features/listas/components/abas-listas";
import { GradeFilmes } from "@/features/listas/components/grade-filmes";
import { obterItensLista } from "@/features/listas/consultas";
import { STATUS_DA_ABA } from "@/features/listas/opcoes";

export const metadata: Metadata = { title: "Minhas listas" };

export default async function ListasPage({ searchParams }: PageProps<"/listas">) {
  const aba = lerAba((await searchParams).aba);
  const [todos, filtro] = await Promise.all([
    obterItensLista(undefined, ["filme", "serie"]),
    obterFiltro(),
  ]);
  // Com filtro por idade, o +18 some da lista e da contagem, sem ser apagado.
  const itens = await semBloqueados(
    todos,
    filtro,
    ({ tipo, tmdbId }) => ({ tipo, tmdbId }),
    classificarMidia,
  );
  const daAba = itens.filter((item) => item.status === STATUS_DA_ABA[aba]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-4xl tracking-tight">Minhas listas</h1>
      <AbasListas
        ativa={aba}
        contagem={{
          quero: itens.filter((item) => item.status === "quero_assistir").length,
          assistidos: itens.filter((item) => item.status === "assistido").length,
        }}
      />
      <GradeFilmes aba={aba} itens={daAba} />
    </div>
  );
}
