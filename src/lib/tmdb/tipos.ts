export type FilmeResumo = {
  id: number;
  titulo: string;
  tituloOriginal: string;
  sinopse: string;
  posterPath: string | null;
  backdropPath: string | null;
  /** IDs de gênero do TMDB. */
  generos: number[];
  ano: number | null;
  nota: number;
  votos: number;
  popularidade: number;
};

export type Pagina<T> = {
  itens: T[];
  pagina: number;
  totalPaginas: number;
  totalResultados: number;
};

export type Provedor = { id: number; nome: string; logoPath: string | null };

export type OndeAssistir = {
  link: string;
  assinatura: Provedor[];
  aluguel: Provedor[];
  compra: Provedor[];
};

export type MembroElenco = { nome: string; personagem: string; fotoPath: string | null };

export type FilmeDetalhes = Omit<FilmeResumo, "generos"> & {
  generos: { id: number; nome: string }[];
  duracaoMin: number | null;
  slogan: string | null;
  /** Key do vídeo no YouTube. */
  trailerYoutube: string | null;
  elenco: MembroElenco[];
  direcao: string[];
  ondeAssistir: OndeAssistir | null;
  parecidos: FilmeResumo[];
};

export type OrdemDescoberta = "popularidade" | "nota" | "lancamento";

/** Classificação indicativa brasileira, na ordem do TMDB (`certification.lte` segue essa ordem). */
export type ClassificacaoBR = "L" | "10" | "12" | "14" | "16" | "18";

export type FiltrosDescoberta = {
  /** Qualquer um destes gêneros. */
  generos?: number[];
  /** Todos estes gêneros juntos; quando presente, tem precedência sobre `generos`. */
  todosGeneros?: number[];
  semGeneros?: number[];
  /** Disponível por assinatura em algum destes provedores (watch_region=BR). */
  provedores?: number[];
  duracaoMin?: number;
  duracaoMax?: number;
  notaMin?: number;
  votosMin?: number;
  /** Ano de lançamento (primary_release_year). */
  ano?: number;
  /** Lançado até esta data, `AAAA-MM-DD` (primary_release_date.lte). */
  lancadoAte?: string;
  /** Classificação indicativa brasileira máxima; filmes sem classificação BR ficam de fora. */
  classificacaoMax?: ClassificacaoBR;
  ordem?: OrdemDescoberta;
  pagina?: number;
};

/**
 * Série num resultado de lista, no mesmo formato de `FilmeResumo` para as telas reaproveitarem
 * os cartões: `titulo` vem de `name` e `ano`, da estreia (`first_air_date`). Os `generos` são
 * IDs de gênero de TV (`/genre/tv/list`), outra lista que a dos filmes.
 */
export type SerieResumo = FilmeResumo;

/**
 * Filtros do `/discover/tv`: os dos filmes, menos a classificação (o TMDB não filtra séries por
 * ela). `duracaoMin` e `duracaoMax` valem para o episódio; `ano` e `lancadoAte`, para a estreia.
 */
export type FiltrosDescobertaSerie = Omit<FiltrosDescoberta, "classificacaoMax">;
