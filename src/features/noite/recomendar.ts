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

async function consultar(api: ApiNoite, filtros: FiltrosDescoberta): Promise<Pagina<FilmeResumo>> {
  try {
    return await api.descobrirFilmes(filtros);
  } catch (erro) {
    console.error("[noite] consulta falhou:", erro);
    return { itens: [], pagina: 1, totalPaginas: 0, totalResultados: 0 };
  }
}

async function detalhar(api: ApiNoite, id: number): Promise<FilmeDetalhes | null> {
  try {
    return await api.obterFilme(id);
  } catch (erro) {
    console.error("[noite] detalhes falharam:", erro);
    return null;
  }
}

/**
 * Filmes da rodada: 1 na primeira, 1 destaque + 2 opções depois de uma troca.
 * Busca primeiro nos streamings da pessoa e completa sem filtro de provedor. Nunca devolve
 * filme excluído, já mostrado ou de gênero evitado. `null` quando não sobra nenhum.
 */
export async function recomendarNoite({
  respostas,
  estado,
  perfil,
  excluir,
  api,
}: Entrada): Promise<ResultadoNoite | null> {
  const evitados = perfil.generosEvitados;
  const noite = filtrosDaNoite({ respostas, ...estado }, evitados);
  if (!noite) return null;

  const quantidade = estado.trocas === 0 ? 1 : 3;
  const bloqueados = new Set([...excluir, ...estado.vistos]);
  const escolhidos: FilmeResumo[] = [];
  const consultas: FiltrosDescoberta[] = perfil.streamings.length
    ? [{ ...noite.filtros, provedores: perfil.streamings }, noite.filtros]
    : [noite.filtros];

  for (const filtros of consultas) {
    for (let pagina = 1; pagina <= PAGINAS_POR_CONSULTA; pagina++) {
      if (escolhidos.length >= quantidade) break;
      const resultado = await consultar(api, { ...filtros, pagina });
      for (const filme of resultado.itens) {
        const evitado = filme.generos.some((genero) => evitados.includes(genero));
        if (escolhidos.length >= quantidade || evitado || bloqueados.has(filme.id)) continue;
        escolhidos.push(filme);
        bloqueados.add(filme.id);
      }
      if (pagina >= resultado.totalPaginas) break;
    }
  }

  const detalhes = await Promise.all(escolhidos.map(({ id }) => detalhar(api, id)));
  const [destaque, ...opcoes] = detalhes
    .filter((filme): filme is FilmeDetalhes => filme !== null)
    .map((filme) => {
      const provedor = provedorDaNoite(filme.ondeAssistir, perfil.streamings);
      return { filme, provedor, motivo: motivoDaNoite(respostas, noite.tom, filme, provedor) };
    });
  return destaque ? { destaque, opcoes } : null;
}
