type Provedor = { id: number; nome: string };

const SUFIXOS_PLANO = /(\s+(standard with ads|basic with ads|with ads|premium|amazon channel))+$/;

function chaveServico(nome: string): string {
  return nome.toLowerCase().replace(/\+/g, " plus").replace(/\s+/g, " ").trim().replace(SUFIXOS_PLANO, "");
}

/** Um nome por serviço, o da primeira ocorrência, mantendo a ordem. Com `marcados`, só os grupos com alguma variante marcada. */
export function nomesPorServico(lista: Provedor[], marcados?: Set<number>): string[] {
  const grupos = new Map<string, { nome: string; marcado: boolean }>();
  for (const p of lista) {
    const chave = chaveServico(p.nome);
    const grupo = grupos.get(chave) ?? { nome: p.nome, marcado: false };
    grupo.marcado ||= marcados?.has(p.id) ?? false;
    grupos.set(chave, grupo);
  }
  return [...grupos.values()].filter((g) => !marcados || g.marcado).map((g) => g.nome);
}
