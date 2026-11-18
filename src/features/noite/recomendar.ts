import type { Clima } from "@/features/metricas/eventos";
import type { EstadoNoite } from "@/features/noite/estado";
import { filtrosDaNoite } from "@/features/noite/filtros";
import { motivoDaNoite, provedorDaNoite } from "@/features/noite/motivo";
import type { PreferenciasInput } from "@/features/preferencias/schema";
import type { ApiFilmes } from "@/lib/tmdb/filmes";
import type {
  FilmeDetalhes,
  FilmeResumo,
  FiltrosDescoberta,
  Pagina,
  Provedor,
} from "@/lib/tmdb/tipos";

export type ApiNoite = Pick<ApiFilmes, "descobrirFilmes" | "obterFilme">;
export type PerfilNoite = Pick<PreferenciasInput, "generosEvitados" | "streamings">;

export type FilmeDaNoite = { filme: FilmeDetalhes; provedor: Provedor | null; motivo: string };
export type ResultadoNoite = { destaque: FilmeDaNoite; opcoes: FilmeDaNoite[] };

type Entrada = {
  respostas: Clima;
  estado: Pick<EstadoNoite, "tom" | "duracaoMax" | "vistos" | "trocas">;
  perfil: PerfilNoite;
  /** "Já assisti" e filmes com reação. */
  excluir: number[];
  api: ApiNoite;
};

/** Páginas lidas por consulta para completar a rodada. */
const PAGINAS_POR_CONSULTA = 2;

/** O TMDB falhou e a rodada ficou sem filmes: refazer as perguntas não resolveria. */
export class NoiteIndisponivel extends Error {
  constructor() {
    super("O TMDB falhou e a rodada ficou sem filmes.");
    this.name = "NoiteIndisponivel";
  }
}

async function consultar(
  api: ApiNoite,
  filtros: FiltrosDescoberta,
  aoFalhar: () => void,
): Promise<Pagina<FilmeResumo>> {
  try {
    return await api.descobrirFilmes(filtros);
  } catch (erro) {
    console.error("[noite] consulta falhou:", erro);
    aoFalhar();
    return { itens: [], pagina: 1, totalPaginas: 0, totalResultados: 0 };
  }
}

async function detalhar(
  api: ApiNoite,
  id: number,
  aoFalhar: () => void,
): Promise<FilmeDetalhes | null> {
  try {
    return await api.obterFilme(id);
  } catch (erro) {
    console.error("[noite] detalhes falharam:", erro);
    aoFalhar();
    return null;
  }
}

/**
 * Filmes da rodada: 1 na primeira, 1 destaque + 2 opções depois de uma troca.
 * Busca primeiro nos streamings da pessoa e completa sem filtro de provedor. Nunca devolve
 * filme excluído, já mostrado ou de gênero evitado. `null` quando não sobra nenhum; lança
 * `NoiteIndisponivel` quando não sobra nenhum porque o TMDB falhou.
 */
export async function recomendarNoite({
  respostas,
  estado,
  perfil,
  excluir,
  api,
}: Entrada): Promise<ResultadoNoite | null> {
  const evitados = perfil.generosEvitados;
  const { tom, duracaoMax } = estado;
  const noite = filtrosDaNoite({ respostas, tom, duracaoMax }, evitados);
  if (!noite) return null;

  let falhou = false;
  const aoFalhar = () => {
    falhou = true;
  };
  const quantidade = estado.trocas === 0 ? 1 : 3;
  const bloqueados = new Set([...excluir, ...estado.vistos]);
  const escolhidos: FilmeResumo[] = [];
  const consultas: FiltrosDescoberta[] = perfil.streamings.length
    ? [{ ...noite.filtros, provedores: perfil.streamings }, noite.filtros]
    : [noite.filtros];

  for (const filtros of consultas) {
    for (let pagina = 1; pagina <= PAGINAS_POR_CONSULTA; pagina++) {
      if (escolhidos.length >= quantidade) break;
      const resultado = await consultar(api, { ...filtros, pagina }, aoFalhar);
      for (const filme of resultado.itens) {
        const evitado = filme.generos.some((genero) => evitados.includes(genero));
        if (escolhidos.length >= quantidade || evitado || bloqueados.has(filme.id)) continue;
        escolhidos.push(filme);
        bloqueados.add(filme.id);
      }
      if (pagina >= resultado.totalPaginas) break;
    }
  }

  const detalhes = await Promise.all(escolhidos.map(({ id }) => detalhar(api, id, aoFalhar)));
  const [destaque, ...opcoes] = detalhes
    .filter((filme): filme is FilmeDetalhes => filme !== null)
    .map((filme) => {
      const provedor = provedorDaNoite(filme.ondeAssistir, perfil.streamings);
      return { filme, provedor, motivo: motivoDaNoite(respostas, noite.tom, filme, provedor) };
    });
  if (destaque) return { destaque, opcoes };
  if (falhou) throw new NoiteIndisponivel();
  return null;
}
