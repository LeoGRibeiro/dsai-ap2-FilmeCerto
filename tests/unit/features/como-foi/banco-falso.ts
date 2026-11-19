type Erro = { code: string; message: string } | null;
type Chamada = { tabela: string; op: string; valor?: unknown; filtros: [string, unknown][] };

/** Supabase falso: toda leitura devolve `linha`; guarda cada escrita com os filtros. */
export function bancoFalso({ linha = null as object | null, erro = null as Erro } = {}) {
  const chamadas: Chamada[] = [];
  const from = (tabela: string) => {
    const chamada: Chamada = { tabela, op: "select", filtros: [] };
    chamadas.push(chamada);
    const resposta = () => ({ data: chamada.op === "select" ? linha : null, error: erro });
    const consulta = {
      select: () => consulta,
      order: () => consulta,
      limit: () => consulta,
      insert: (valor: unknown) => Object.assign(chamada, { op: "insert", valor }) && consulta,
      update: (valor: unknown) => Object.assign(chamada, { op: "update", valor }) && consulta,
      eq: (coluna: string, valor: unknown) => {
        chamada.filtros.push([coluna, valor]);
        return consulta;
      },
      maybeSingle: () => Promise.resolve(resposta()),
      then: (ok: (r: ReturnType<typeof resposta>) => unknown) =>
        Promise.resolve(resposta()).then(ok),
    };
    return consulta;
  };
  const escritas = () => chamadas.filter((c) => c.op !== "select");
  return { cliente: { from } as never, escritas };
}

export const horasAtras = (horas: number) => new Date(Date.now() - horas * 3_600_000).toISOString();

/** Linha de `escolhas_noite` escolhida ontem, nunca perguntada. */
export function escolha(sobrescrever: object = {}) {
  return {
    id: 7,
    tipo: "filme",
    tmdb_id: 550,
    titulo: "Clube da Luta",
    escolhido_em: horasAtras(20),
    perguntado_em: null,
    vezes_perguntado: 0,
    respondido_em: null,
    ...sobrescrever,
  };
}
