import type { Clima } from "@/features/metricas/eventos";
import type { EstadoNoite } from "@/features/noite/estado";
import { filtrosDaNoite } from "@/features/noite/filtros";
import { filtrosJuntos, motivoJuntos } from "@/features/noite/juntos";
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
  estado: Pick<EstadoNoite, "tom" | "duracaoMax" | "vistos" | "trocas"> &
    Partial<Pick<EstadoNoite, "tempo">>;
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

type Busca = {
  filtros: FiltrosDescoberta;
  quantidade: number;
  perfil: PerfilNoite;
  /** IDs que nunca entram ("Já assisti", reações, já mostrados). */
  bloqueados: number[];
  api: ApiNoite;
  /** Confere os detalhes (ex.: a duração do "Até que horas?"). */
  cabe?: (filme: FilmeDetalhes) => boolean;
};

/**
 * Até `quantidade` filmes, com detalhes: primeiro nos streamings do perfil, depois sem filtro
 * de provedor. Nunca devolve filme bloqueado ou de gênero evitado (mesmo se o TMDB devolver).
 * `falhou` diz se alguma consulta ao TMDB falhou no caminho.
 */
export async function buscarFilmes({
  filtros,
  quantidade,
  perfil,
  bloqueados: excluidos,
  api,
  cabe = () => true,
}: Busca): Promise<{ filmes: FilmeDetalhes[]; falhou: boolean }> {
  let falhou = false;
  const aoFalhar = () => {
    falhou = true;
  };
  const evitados = perfil.generosEvitados;
  const bloqueados = new Set(excluidos);
  const escolhidos: FilmeResumo[] = [];
  const consultas: FiltrosDescoberta[] = perfil.streamings.length
    ? [{ ...filtros, provedores: perfil.streamings }, filtros]
    : [filtros];

  for (const consulta of consultas) {
    for (let pagina = 1; pagina <= PAGINAS_POR_CONSULTA; pagina++) {
      if (escolhidos.length >= quantidade) break;
      const resultado = await consultar(api, { ...consulta, pagina }, aoFalhar);
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
  const filmes = detalhes.filter((filme): filme is FilmeDetalhes => filme !== null && cabe(filme));
  return { filmes, falhou };
}

/** O primeiro filme vira o destaque. `null` sem filme; `NoiteIndisponivel` se o TMDB falhou. */
function comoResultado(
  { filmes, falhou }: { filmes: FilmeDetalhes[]; falhou: boolean },
  perfil: PerfilNoite,
  motivo: (filme: FilmeDetalhes, provedor: Provedor | null) => string,
): ResultadoNoite | null {
  const [destaque, ...opcoes] = filmes.map((filme) => {
    const provedor = provedorDaNoite(filme.ondeAssistir, perfil.streamings);
    return { filme, provedor, motivo: motivo(filme, provedor) };
  });
  if (destaque) return { destaque, opcoes };
  if (falhou) throw new NoiteIndisponivel();
  return null;
}

/**
 * Filmes da rodada: 1 na primeira, 1 destaque + 2 opções depois de uma troca.
 * Nunca devolve filme excluído, já mostrado, de gênero evitado ou que passa do
 * "Até que horas?". `null` quando não sobra nenhum; lança `NoiteIndisponivel` quando não
 * sobra nenhum porque o TMDB falhou.
 */
export async function recomendarNoite({
  respostas,
  estado,
  perfil,
  excluir,
  api,
}: Entrada): Promise<ResultadoNoite | null> {
  const { tom, duracaoMax, tempo = null } = estado;
  const noite = filtrosDaNoite({ respostas, tom, duracaoMax, tempo }, perfil.generosEvitados);
  if (!noite) return null;

  const busca = await buscarFilmes({
    filtros: noite.filtros,
    quantidade: estado.trocas === 0 ? 1 : 3,
    perfil,
    bloqueados: [...excluir, ...estado.vistos],
    api,
    // "Até que horas?" promete que o filme termina a tempo: confere a duração nos detalhes.
    cabe: ({ duracaoMin }) => tempo === null || (duracaoMin !== null && duracaoMin <= tempo),
  });
  return comoResultado(busca, perfil, (filme, provedor) =>
    motivoDaNoite(respostas, noite.tom, filme, provedor),
  );
}

/**
 * "Noite a dois" (SPEC/2026-11-18-noite-a-dois.md): 1 destaque + 2 opções para as duas
 * pessoas. `perfil` e `excluir` já são a união dos perfis das duas; `a` é quem criou a sala.
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
    perfil,
    bloqueados: excluir,
    api,
  });
  return comoResultado(busca, perfil, (filme, provedor) =>
    motivoJuntos(a, b, juntos.tom, filme, provedor),
  );
}
