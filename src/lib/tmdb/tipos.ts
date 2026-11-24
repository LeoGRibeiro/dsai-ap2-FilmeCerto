export type FilmeResumo = {
  id: number;
  titulo: string;
  tituloOriginal: string;
  sinopse: string;
  posterPath: string | null;
  backdropPath: string | null;
  /** IDs de gÃªnero do TMDB. */
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
  /** Key do vÃ­deo no YouTube. */
  trailerYoutube: string | null;
  elenco: MembroElenco[];
  direcao: string[];
  ondeAssistir: OndeAssistir | null;
  parecidos: FilmeResumo[];
  /** ClassificaÃ§Ã£o indicativa: a do Brasil ou a dos EUA convertida; `null` sem nenhuma. */
  classificacao: ClassificacaoBR | null;
};

export type OrdemDescoberta = "popularidade" | "nota" | "lancamento";

/** ClassificaÃ§Ã£o indicativa brasileira, na ordem do TMDB (`certification.lte` segue essa ordem). */
export type ClassificacaoBR = "L" | "10" | "12" | "14" | "16" | "18";

export type FiltrosDescoberta = {
  /** Qualquer um destes gÃªneros. */
  generos?: number[];
  /** Todos estes gÃªneros juntos; quando presente, tem precedÃªncia sobre `generos`. */
  todosGeneros?: number[];
  semGeneros?: number[];
  /** DisponÃ­vel por assinatura em algum destes provedores (watch_region=BR). */
  provedores?: number[];
  duracaoMin?: number;
  duracaoMax?: number;
  notaMin?: number;
  votosMin?: number;
  /** Ano de lanÃ§amento (primary_release_year). */
  ano?: number;
  /** LanÃ§ado atÃ© esta data, `AAAA-MM-DD` (primary_release_date.lte). */
  lancadoAte?: string;
  /** ClassificaÃ§Ã£o indicativa brasileira mÃ¡xima; filmes sem classificaÃ§Ã£o BR ficam de fora. */
  classificacaoMax?: ClassificacaoBR;
  ordem?: OrdemDescoberta;
  pagina?: number;
};

/**
 * SÃ©rie num resultado de lista, no mesmo formato de `FilmeResumo` para as telas reaproveitarem
 * os cartÃµes: `titulo` vem de `name` e `ano`, da estreia (`first_air_date`). Os `generos` sÃ£o
 * IDs de gÃªnero de TV (`/genre/tv/list`), outra lista que a dos filmes.
 */
export type SerieResumo = FilmeResumo;

export type Temporada = {
  numero: number;
  nome: string;
  episodios: number;
  /** Ano de estreia da temporada. */
  ano: number | null;
  posterPath: string | null;
};

export type EpisodioPrevisto = {
  id: number | null;
  nome: string | null;
  temporadaNumero: number | null;
  episodioNumero: number | null;
  data: string | null;
};

export type SerieDetalhes = Omit<SerieResumo, "generos"> & {
  generos: { id: number; nome: string }[];
  /** DuraÃ§Ã£o mÃ©dia do episÃ³dio, em minutos. */
  duracaoEpisodioMin: number | null;
  /** Sem os especiais (temporada 0), em ordem. */
  temporadas: Temporada[];
  slogan: string | null;
  /** Key do vÃ­deo no YouTube. */
  trailerYoutube: string | null;
  elenco: MembroElenco[];
  /** Quem criou a sÃ©rie. */
  criacao: string[];
  /** ClassificaÃ§Ã£o indicativa no Brasil. */
  classificacao: ClassificacaoBR | null;
  ondeAssistir: OndeAssistir | null;
  /**
   * `status` do TMDB, sem traduÃ§Ã£o ("Returning Series", "Ended"...). Opcional, como
   * `proximoEpisodio`, para quem monta detalhes Ã  mÃ£o (o wizard) nÃ£o precisar dele.
   */
  situacao?: string | null;
  /** Data de exibiÃ§Ã£o do prÃ³ximo episÃ³dio, `AAAA-MM-DD`. */
  proximoEpisodio?: string | null;
  /** Dados completos do próximo episódio informado pela TMDB. */
  proximoEpisodioDetalhes?: EpisodioPrevisto | null;
};

export type Episodio = {
  numero: number;
  nome: string;
  sinopse: string;
  /** DuraÃ§Ã£o em minutos; `null` quando o TMDB nÃ£o sabe (ou manda 0). */
  duracaoMin: number | null;
  /** Data de exibiÃ§Ã£o, `AAAA-MM-DD`. */
  data: string | null;
  stillPath: string | null;
  /** Nota mÃ©dia; `null` sem votos. */
  nota: number | null;
};

/** Uma temporada com os episÃ³dios, para a pÃ¡gina `/serie/{id}/temporada/{n}`. */
export type TemporadaDetalhes = {
  numero: number;
  nome: string;
  sinopse: string;
  /** Ano de estreia da temporada. */
  ano: number | null;
  posterPath: string | null;
  episodios: Episodio[];
};

/**
 * Filtros do `/discover/tv`: os dos filmes, menos a classificaÃ§Ã£o (o TMDB nÃ£o filtra sÃ©ries por
 * ela). `duracaoMin` e `duracaoMax` valem para o episÃ³dio; `ano` e `lancadoAte`, para a estreia.
 */
export type FiltrosDescobertaSerie = Omit<FiltrosDescoberta, "classificacaoMax">;

