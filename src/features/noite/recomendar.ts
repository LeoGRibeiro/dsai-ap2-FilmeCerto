import type { Clima } from "@/features/metricas/eventos";
import type { EstadoNoite } from "@/features/noite/estado";
import { filtrosDaNoite } from "@/features/noite/filtros";
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
  const { api } = entrada;
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
  const fonte = fonteDa(entrada);

  let falhou = false;
  const aoFalhar = () => {
    falhou = true;
  };
  const quantidade = estado.trocas === 0 ? 1 : 3;
  // O que só se confere nos detalhes pode descartar candidatos: lê alguns a mais.
  const confere = tempo !== null || classificacao !== null;
  const candidatos = confere ? quantidade * FOLGA_CONFERENCIA : quantidade;
  const bloqueados = new Set([...excluir, ...estado.vistos]);
  const escolhidos: FilmeResumo[] = [];
  const consultas: FiltrosDescoberta[] = perfil.streamings.length
    ? [{ ...noite.filtros, provedores: perfil.streamings }, noite.filtros]
    : [noite.filtros];

  for (const filtros of consultas) {
    for (let pagina = 1; pagina <= PAGINAS_POR_CONSULTA; pagina++) {
      if (escolhidos.length >= candidatos) break;
      const resultado = await consultar(fonte, { ...filtros, pagina }, aoFalhar);
      for (const filme of resultado.itens) {
        const evitado = filme.generos.some((genero) => evitados.includes(genero));
        if (escolhidos.length >= candidatos || evitado || bloqueados.has(filme.id)) continue;
        escolhidos.push(filme);
        bloqueados.add(filme.id);
      }
      if (pagina >= resultado.totalPaginas) break;
    }
  }

  // "Até que horas?" promete que o filme (ou o episódio) termina a tempo, e a série em família
  // não tem filtro de classificação no TMDB: os dois são conferidos nos detalhes.
  const passa = ({ duracaoMin, classificacao: dele }: TituloNoite) =>
    (tempo === null || (duracaoMin !== null && duracaoMin <= tempo)) &&
    (classificacao === null || ateAClassificacao(dele, classificacao));
  const detalhes = await Promise.all(escolhidos.map(({ id }) => detalhar(fonte, id, aoFalhar)));
  const [destaque, ...opcoes] = detalhes
    .filter((filme): filme is TituloNoite => filme !== null && passa(filme))
    .slice(0, quantidade)
    .map((filme) => {
      const provedor = provedorDaNoite(filme.ondeAssistir, perfil.streamings);
      return { filme, provedor, motivo: motivoDaNoite(respostas, noite.tom, filme, provedor) };
    });
  if (destaque) return { destaque, opcoes };
  if (falhou) throw new NoiteIndisponivel();
  return null;
}
