import type { Compartilhado } from "@/features/compartilhado/titulo";
import type { FilmeDetalhes, OndeAssistir, SerieDetalhes } from "@/lib/tmdb/tipos";

/** Títulos da página pública: só os campos que ela mostra têm valores próprios. */
const ONDE: OndeAssistir = {
  link: "https://www.themoviedb.org/movie/603/watch?locale=BR",
  assinatura: [{ id: 8, nome: "Netflix", logoPath: null }],
  aluguel: [],
  compra: [],
};

const comum = {
  backdropPath: null,
  generos: [{ id: 878, nome: "Ficção científica" }],
  nota: 8.2,
  votos: 26000,
  popularidade: 90,
  slogan: null,
  trailerYoutube: null,
  elenco: [],
  ondeAssistir: ONDE,
};

export function filmeCompartilhado(dados: Partial<FilmeDetalhes> = {}): Compartilhado {
  return {
    tipo: "filme",
    titulo: {
      ...comum,
      id: 603,
      titulo: "Matrix",
      tituloOriginal: "The Matrix",
      sinopse: "Um hacker descobre a verdade sobre a realidade.",
      posterPath: "/matrix.jpg",
      ano: 1999,
      duracaoMin: 125,
      direcao: ["Lana Wachowski"],
      parecidos: [],
      classificacao: "14",
      ...dados,
    },
  };
}

export function serieCompartilhada(dados: Partial<SerieDetalhes> = {}): Compartilhado {
  return {
    tipo: "serie",
    titulo: {
      ...comum,
      id: 70523,
      titulo: "Dark",
      tituloOriginal: "Dark",
      sinopse: "Crianças somem numa cidade alemã.",
      posterPath: null,
      ano: 2017,
      duracaoEpisodioMin: 50,
      temporadas: [{ numero: 1, nome: "Temporada 1", episodios: 10, ano: 2017, posterPath: null }],
      criacao: ["Baran bo Odar"],
      classificacao: "16",
      ...dados,
    },
  };
}
