import type { Clima } from "@/features/metricas/eventos";
import type { EstadoNoite } from "@/features/noite/estado";
import { filtrosDaNoite } from "@/features/noite/filtros";
import { filtrosJuntos, motivoJuntos } from "@/features/noite/juntos";
import { motivoDaNoite, provedorDaNoite } from "@/features/noite/motivo";
import type { PreferenciasInput } from "@/features/preferencias/schema";
import type { ApiFilmes } from "@/lib/tmdb/filmes";
import { CLASSIFICACOES_BR, type ApiSeries } from "@/lib/tmdb/series";
import type {
  ClassificacaoBR,
  FilmeDetalhes,
  FilmeResumo,
  FiltrosDescoberta,
  Pagina,
  Provedor,
} from "@/lib/tmdb/tipos";

export type ApiNoite = Pick<ApiFilmes, "descobrirFilmes" | "obterFilme">;
export type ApiNoiteSerie = Pick<ApiSeries, "descobrirSeries" | "obterSerie">;
export type PerfilNoite = Pick<PreferenciasInput, "generosEvitados" | "streamings">;

/** O que a noite usa de um filme ou de uma série. Na série, `duracaoMin` é a do episódio. */
export type TituloNoite = Pick<
  FilmeDetalhes,
  | "id"
  | "titulo"
  | "ano"
  | "posterPath"
  | "sinopse"
  | "duracaoMin"
  | "trailerYoutube"
  | "ondeAssistir"
  | "nota"
  | "generos"
> & { classificacao?: ClassificacaoBR | null };

export type FilmeDaNoite = { filme: TituloNoite; provedor: Provedor | null; motivo: string };
export type ResultadoNoite = { destaque: FilmeDaNoite; opcoes: FilmeDaNoite[] };

type Comum = {
  respostas: Clima;
  estado: Pick<EstadoNoite, "tom" | "duracaoMax" | "vistos" | "trocas"> &
    Partial<Pick<EstadoNoite, "tempo">>;
  perfil: PerfilNoite;
  /** "Já assisti" e títulos com reação, do mesmo tipo. */
  excluir: number[];
};

/** Filme (sem `tipo`, como antes) ou série, cada um com a API do TMDB do seu tipo. */
type Entrada = Comum & ({ tipo?: "filme"; api: ApiNoite } | { tipo: "serie"; api: ApiNoiteSerie });

/** Páginas lidas por consulta para completar a rodada. */
const PAGINAS_POR_CONSULTA = 2;

/** Com conferência nos detalhes (horário, classificação), quantos candidatos por vaga. */
const FOLGA_CONFERENCIA = 3;

type Fonte = {
  descobrir: (filtros: FiltrosDescoberta) => Promise<Pagina<FilmeResumo>>;
  detalhar: (id: number) => Promise<TituloNoite | null>;
};

/** As chamadas do TMDB do tipo; a série chega no formato do filme, com a duração do episódio. */
function fonteDa(entrada: Entrada): Fonte {
  if (entrada.tipo === "serie") {
    const { api } = entrada;
    return {
      descobrir: (filtros) => api.descobrirSeries(filtros),
      detalhar: async (id) => {
        const serie = await api.obterSerie(id);
        return serie && { ...serie, duracaoMin: serie.duracaoEpisodioMin };
      },
    };
  }
  return fonteDeFilmes(entrada.api);
}

function fonteDeFilmes(api: ApiNoite): Fonte {
  return {
    descobrir: (filtros) => api.descobrirFilmes(filtros),
    detalhar: (id) => api.obterFilme(id),
  };
}

/** Classificação conhecida e até `maxima`; sem classificação BR, não passa. */
function ateAClassificacao(
  classificacao: ClassificacaoBR | null | undefined,
  maxima: ClassificacaoBR,
) {
  return (
    !!classificacao && CLASSIFICACOES_BR.indexOf(classificacao) <= CLASSIFICACOES_BR.indexOf(maxima)
  );
}

/** O TMDB falhou e a rodada ficou sem filmes: refazer as perguntas não resolveria. */
export class NoiteIndisponivel extends Error {
  constructor() {
    super("O TMDB falhou e a rodada ficou sem filmes.");
    this.name = "NoiteIndisponivel";
  }
}

async function consultar(
  fonte: Fonte,
  filtros: FiltrosDescoberta,
  aoFalhar: () => void,
): Promise<Pagina<FilmeResumo>> {
  try {
    return await fonte.descobrir(filtros);
  } catch (erro) {
    console.error("[noite] consulta falhou:", erro);
    aoFalhar();
    return { itens: [], pagina: 1, totalPaginas: 0, totalResultados: 0 };
  }
}

async function detalhar(
  fonte: Fonte,
  id: number,
  aoFalhar: () => void,
): Promise<TituloNoite | null> {
  try {
    return await fonte.detalhar(id);
  } catch (erro) {
    console.error("[noite] detalhes falharam:", erro);
    aoFalhar();
    return null;
  }
}

type Busca = {
  filtros: FiltrosDescoberta;
  quantidade: number;
  streamings: readonly number[];
  /** Gêneros evitados nos IDs do tipo, conferidos também no resultado. */
  evitados: readonly number[];
  /** IDs que nunca entram ("Já assisti", reações, já mostrados). */
  bloqueados: number[];
  fonte: Fonte;
  /** Conferência nos detalhes (horário, classificação): lê candidatos a mais. */
  passa?: (titulo: TituloNoite) => boolean;
};

/**
 * Até `quantidade` títulos, com detalhes: primeiro nos streamings, depois sem filtro de
 * provedor. Nunca devolve título bloqueado ou de gênero evitado (mesmo se o TMDB devolver).
 * `falhou` diz se alguma consulta ao TMDB falhou no caminho.
 */
export async function buscarFilmes({
  filtros,
  quantidade,
  streamings,
  evitados,
  bloqueados: excluidos,
  fonte,
  passa,
}: Busca): Promise<{ titulos: TituloNoite[]; falhou: boolean }> {
  let falhou = false;
  const aoFalhar = () => {
    falhou = true;
  };
  // O que só se confere nos detalhes pode descartar candidatos: lê alguns a mais.
  const candidatos = passa ? quantidade * FOLGA_CONFERENCIA : quantidade;
  const bloqueados = new Set(excluidos);
  const escolhidos: FilmeResumo[] = [];
  const consultas: FiltrosDescoberta[] = streamings.length
    ? [{ ...filtros, provedores: [...streamings] }, filtros]
    : [filtros];

  for (const consulta of consultas) {
    for (let pagina = 1; pagina <= PAGINAS_POR_CONSULTA; pagina++) {
      if (escolhidos.length >= candidatos) break;
      const resultado = await consultar(fonte, { ...consulta, pagina }, aoFalhar);
      for (const filme of resultado.itens) {
        const evitado = filme.generos.some((genero) => evitados.includes(genero));
        if (escolhidos.length >= candidatos || evitado || bloqueados.has(filme.id)) continue;
        escolhidos.push(filme);
        bloqueados.add(filme.id);
      }
      if (pagina >= resultado.totalPaginas) break;
    }
  }

  const detalhes = await Promise.all(escolhidos.map(({ id }) => detalhar(fonte, id, aoFalhar)));
  const titulos = detalhes
    .filter((titulo): titulo is TituloNoite => titulo !== null && (!passa || passa(titulo)))
    .slice(0, quantidade);
  return { titulos, falhou };
}

/** O primeiro título vira o destaque. `null` sem título; `NoiteIndisponivel` se o TMDB falhou. */
function comoResultado(
  { titulos, falhou }: { titulos: TituloNoite[]; falhou: boolean },
  perfil: PerfilNoite,
  motivo: (titulo: TituloNoite, provedor: Provedor | null) => string,
): ResultadoNoite | null {
  const [destaque, ...opcoes] = titulos.map((filme) => {
    const provedor = provedorDaNoite(filme.ondeAssistir, perfil.streamings);
    return { filme, provedor, motivo: motivo(filme, provedor) };
  });
  if (destaque) return { destaque, opcoes };
  if (falhou) throw new NoiteIndisponivel();
  return null;
}

/**
 * Filmes (ou séries) da rodada: 1 na primeira, 1 destaque + 2 opções depois de uma troca.
 * Busca primeiro nos streamings da pessoa e completa sem filtro de provedor. Nunca devolve
 * título excluído, já mostrado, de gênero evitado, que passa do "Até que horas?" ou, na série
 * em família, acima da classificação. `null` quando não sobra nenhum; lança
 * `NoiteIndisponivel` quando não sobra nenhum porque o TMDB falhou.
 */
export async function recomendarNoite(entrada: Entrada): Promise<ResultadoNoite | null> {
  const { respostas, estado, perfil, excluir, tipo = "filme" } = entrada;
  const { tom, duracaoMax, tempo = null } = estado;
  const noite = filtrosDaNoite({ respostas, tom, duracaoMax, tempo, tipo }, perfil.generosEvitados);
  if (!noite) return null;
  const { evitados, classificacaoNosDetalhes: classificacao } = noite;

  // "Até que horas?" promete que o filme (ou o episódio) termina a tempo, e a série em família
  // não tem filtro de classificação no TMDB: os dois são conferidos nos detalhes.
  const confere = tempo !== null || classificacao !== null;
  const passa = ({ duracaoMin, classificacao: dele }: TituloNoite) =>
    (tempo === null || (duracaoMin !== null && duracaoMin <= tempo)) &&
    (classificacao === null || ateAClassificacao(dele, classificacao));
  const busca = await buscarFilmes({
    filtros: noite.filtros,
    quantidade: estado.trocas === 0 ? 1 : 3,
    streamings: perfil.streamings,
    evitados,
    bloqueados: [...excluir, ...estado.vistos],
    fonte: fonteDa(entrada),
    ...(confere && { passa }),
  });
  return comoResultado(busca, perfil, (filme, provedor) =>
    motivoDaNoite(respostas, noite.tom, filme, provedor),
  );
}

/**
 * "Noite a dois" (SPEC/2026-11-18-noite-a-dois.md): 1 destaque + 2 opções de filme para as
 * duas pessoas. `perfil` e `excluir` já são a união dos perfis das duas; `a` é quem criou a sala.
 */
export async function recomendarJuntos({
  a,
  b,
  perfil,
  excluir,
  api,
}: {
  a: Clima;
  b: Clima;
  perfil: PerfilNoite;
  excluir: number[];
  api: ApiNoite;
}): Promise<ResultadoNoite | null> {
  const juntos = filtrosJuntos(a, b, perfil.generosEvitados);
  if (!juntos) return null;
  const busca = await buscarFilmes({
    filtros: juntos.filtros,
    quantidade: 3,
    streamings: perfil.streamings,
    evitados: juntos.evitados,
    bloqueados: excluir,
    fonte: fonteDeFilmes(api),
  });
  return comoResultado(busca, perfil, (filme, provedor) =>
    motivoJuntos(a, b, juntos.tom, filme, provedor),
  );
}
