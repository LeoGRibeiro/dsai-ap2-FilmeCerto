import type { Clima } from "@/features/metricas/eventos";
import type { FilmeNaTela } from "@/features/noite/components/filme-destaque";
import { ResultadoNoite } from "@/features/noite/components/resultado-noite";
import { SemNoite } from "@/features/noite/components/sem-noite";
import { SemTempo } from "@/features/noite/components/sem-tempo";
import { obterNoite } from "@/features/noite/consultas";
import { urlsDaTroca, type EstadoNoite } from "@/features/noite/estado";
import { MAPEAMENTOS } from "@/features/noite/filtros";
import type { FilmeDaNoite, PerfilNoite } from "@/features/noite/recomendar";
import type { TipoMidia } from "@/lib/midia";

/** Só os campos que a tela usa: elenco, parecidos e o resto do TMDB ficam no servidor. */
export function paraTela(
  { filme, provedor, motivo }: FilmeDaNoite,
  tipo: TipoMidia = "filme",
): FilmeNaTela {
  const { id, titulo, ano, posterPath, sinopse, duracaoMin, trailerYoutube } = filme;
  const naTela = { id, titulo, ano, posterPath, sinopse, duracaoMin, trailerYoutube };
  return { tipo, ...naTela, motivo, provedor };
}

/**
 * Busca a rodada no servidor. Sem tempo até o "Até que horas?", nem consulta o TMDB.
 * Sem filme, oferece refazer; TMDB fora do ar vai ao `error.tsx`.
 */
export async function RecomendacaoNoite({
  respostas,
  estado,
  perfil,
}: {
  respostas: Clima;
  estado: EstadoNoite;
  perfil: PerfilNoite;
}) {
  const { tempo, tipo } = estado;
  if (tempo !== null && tempo < MAPEAMENTOS[tipo].tempoMinimo) {
    return <SemTempo estado={estado} tempo={tempo} />;
  }

  const resultado = await obterNoite(respostas, estado, perfil);
  if (!resultado) return <SemNoite tipo={tipo} />;

  // "Esse não" recusa tudo o que está na tela; o destaque vem primeiro ("Muito longo" usa a duração dele).
  const mostrados = [resultado.destaque, ...resultado.opcoes].map(({ filme }) => filme);
  return (
    <ResultadoNoite
      respostas={respostas}
      trocas={estado.trocas}
      destaque={paraTela(resultado.destaque, tipo)}
      opcoes={resultado.opcoes.map((opcao) => paraTela(opcao, tipo))}
      proximas={urlsDaTroca(estado, mostrados)}
    />
  );
}

/** Enquanto o TMDB responde: o formato do destaque, sem conteúdo. */
export function EsqueletoNoite({ tipo = "filme" }: { tipo?: TipoMidia }) {
  return (
    <div role="status" className="flex flex-col gap-5">
      <p className="text-muted-foreground">
        Procurando {tipo === "serie" ? "a série" : "o filme"} da sua noite…
      </p>
      <div className="flex gap-4 sm:gap-6">
        <div className="bg-muted aspect-[2/3] w-28 shrink-0 animate-pulse rounded-lg sm:w-44" />
        <div className="flex flex-1 flex-col gap-3">
          <div className="bg-muted h-8 w-3/4 animate-pulse rounded" />
          <div className="bg-muted h-4 w-1/3 animate-pulse rounded" />
          <div className="bg-muted h-4 w-1/2 animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
}
