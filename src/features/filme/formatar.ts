/** "2h 19min", "2h", "45min"; `null` para duração ausente. */
export function formatarDuracao(minutos: number | null): string | null {
  if (!minutos) return null;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (!horas) return `${resto}min`;
  return resto ? `${horas}h ${resto}min` : `${horas}h`;
}

const numeroPtBr = new Intl.NumberFormat("pt-BR");

export function formatarVotos(votos: number): string {
  return numeroPtBr.format(votos);
}

/** "Clube da Luta (1999)"; sem ano, só o título. */
export function tituloComAno({ titulo, ano }: { titulo: string; ano: number | null }): string {
  return ano ? `${titulo} (${ano})` : titulo;
}

/** "★ 8.4 (30.000 votos)". */
export function formatarNota(nota: number, votos: number): string {
  return `★ ${nota.toFixed(1)} (${formatarVotos(votos)} votos)`;
}
