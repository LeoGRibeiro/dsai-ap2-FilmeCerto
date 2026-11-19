/** IDs de gênero de TV do TMDB (`/genre/tv/list`): outra lista que a dos filmes. */
export const TV = {
  acaoAventura: 10759,
  animacao: 16,
  comedia: 35,
  crime: 80,
  documentario: 99,
  drama: 18,
  familia: 10751,
  kids: 10762,
  misterio: 9648,
  news: 10763,
  reality: 10764,
  ficcaoFantasia: 10765,
  talk: 10767,
  guerraPolitica: 10768,
} as const;

/**
 * Gêneros de filme do perfil → gêneros de TV (tabela em SPEC/2026-11-19-series-descoberta.md).
 * Os que faltam aqui e não têm o mesmo ID em TV (Terror, Thriller, Romance, História, Música,
 * Cinema TV) não têm equivalente.
 */
const EM_TV: Record<number, number> = {
  28: TV.acaoAventura,
  12: TV.acaoAventura,
  878: TV.ficcaoFantasia,
  14: TV.ficcaoFantasia,
  10752: TV.guerraPolitica,
};
const MESMO_ID = new Set<number>([16, 35, 80, 99, 18, 10751, 37, 9648]);

/** Converte gêneros de filme (o perfil guarda esses) para gêneros de TV, sem repetir. */
export function generosEmTv(generosDeFilme: readonly number[]): number[] {
  const tv = generosDeFilme.flatMap((id) => {
    const equivalente = EM_TV[id] ?? (MESMO_ID.has(id) ? id : undefined);
    return equivalente === undefined ? [] : [equivalente];
  });
  return [...new Set(tv)];
}
