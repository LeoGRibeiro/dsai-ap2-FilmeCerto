type Linha = Record<string, unknown>;
type Filtro = [coluna: string, valor: unknown];
type Escrita = { tabela: string; op: "upsert" | "delete"; valor?: unknown; filtros: Filtro[] };
type Erro = { code: string; message: string } | null;

/**
 * Supabase em memória para testar leituras sem banco: aplica os `.eq()` e `.in()` sobre as linhas dadas,
 * como o PostgREST, e `maybeSingle()` com mais de uma linha devolve erro, como o real.
 * `select` e `order` não mudam nada (as linhas já vêm na ordem do teste). Guarda as escritas;
 * o `delete` também tira as linhas que casam com os filtros.
 */
export function bancoEmMemoria(tabelas: Record<string, Linha[]>) {
  const escritas: Escrita[] = [];

  const from = (tabela: string) => {
    const filtros: Filtro[] = [];
    const inclusoes: [coluna: string, valores: readonly unknown[]][] = [];
    let escrita: Escrita | null = null;
    const casa = (linha: Linha) =>
      filtros.every(([coluna, valor]) => linha[coluna] === valor) &&
      inclusoes.every(([coluna, valores]) => valores.includes(linha[coluna]));
    const linhas = () => tabelas[tabela] ?? [];

    const executar = (): { data: Linha[] | null; error: Erro } => {
      if (!escrita) return { data: linhas().filter(casa), error: null };
      if (escrita.op === "delete") tabelas[tabela] = linhas().filter((linha) => !casa(linha));
      escritas.push(escrita);
      return { data: null, error: null };
    };

    const consulta = {
      select: () => consulta,
      order: () => consulta,
      eq: (coluna: string, valor: unknown) => {
        filtros.push([coluna, valor]);
        return consulta;
      },
      in: (coluna: string, valores: readonly unknown[]) => {
        inclusoes.push([coluna, valores]);
        return consulta;
      },
      delete: () => {
        escrita = { tabela, op: "delete", filtros };
        return consulta;
      },
      upsert: (valor: unknown) => {
        escrita = { tabela, op: "upsert", valor, filtros };
        return consulta;
      },
      maybeSingle: async () => {
        const { data } = executar();
        if (data && data.length > 1) {
          return { data: null, error: { code: "PGRST116", message: "mais de uma linha" } };
        }
        return { data: data?.[0] ?? null, error: null };
      },
      then: <T>(ok: (resposta: ReturnType<typeof executar>) => T, falha?: (erro: unknown) => T) =>
        Promise.resolve().then(executar).then(ok, falha),
    };
    return consulta;
  };

  return { cliente: { from } as never, escritas, tabelas };
}
