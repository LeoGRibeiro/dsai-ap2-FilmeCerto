# Loop: corrigir a saída de uma tool do MCP

Você é uma rodada de um loop. Não há conversa: leia este arquivo e o `loop/ESTADO.md`, faça a tarefa e termine. Uma pessoa roda o portão (`bash loop/portao.sh`) depois de você e decide se há outra rodada.

## Gatilho

Evento: um relato de saída ruim de uma tool do servidor MCP do Filme Certo (`src/features/mcp/`). O relato desta vez veio do diário da aula 6:

> O campo `onde_assistir.assinatura` repete variações do mesmo serviço ("Netflix" e "Netflix Standard with Ads", "Paramount Plus", "Paramount+ Amazon Channel" e "Paramount Plus Premium"). Isso gasta contexto e pode confundir.

## Tarefa

Implemente a spec [SPEC/2026-10-23-mcp-provedores.md](../SPEC/2026-10-23-mcp-provedores.md) na tool `detalhes_filme` ([src/features/mcp/tools/detalhes-filme.ts](../src/features/mcp/tools/detalhes-filme.ts)). Siga o estilo do código ao redor: nomes em português, funções pequenas, sem comentários óbvios.

Se o `loop/ESTADO.md` registrar rodadas anteriores, comece pelo motivo da última falha. Não repita a mesma abordagem que já falhou.

## Critério de parada (verificado por programa)

A rodada passa só se `bash loop/portao.sh` terminar com `PASSOU`. O portão exige, nesta ordem:

1. Nenhum arquivo alterado fora de `src/features/mcp/` e `tests/unit/features/mcp/`.
2. `tests/unit/features/mcp/provedores.test.ts` idêntico ao original.
3. `pnpm exec vitest run --project unit tests/unit/features/mcp/provedores.test.ts`, `pnpm test`, `pnpm typecheck` e `pnpm lint` saindo com código 0.

Rode esses comandos você mesmo antes de terminar.

## Zonas proibidas

Não toque, nem para "só ajustar":

- `tests/unit/features/mcp/provedores.test.ts` (é o teste de aceitação; se achar que ele está errado, pare e explique);
- `supabase/` (migrations e configuração do banco);
- `src/features/mcp/autenticacao.ts`, `src/app/oauth/` e qualquer código de login;
- `.github/`, `package.json`, `pnpm-lock.yaml` e arquivos `.env*`;
- `loop/` (o estado é escrito pela pessoa que roda o portão).

Não instale dependências, não faça commit e não rode `supabase` nem `pnpm db:*`.

## Quando parar e chamar a pessoa

Pare sem terminar a tarefa e escreva na resposta final, começando por `ESCALAR:`, se:

- a solução exigir mexer numa zona proibida;
- o teste de aceitação parecer contradizer a spec;
- a spec for ambígua para um caso que o teste não cobre e a escolha mudar o comportamento;
- você passar de 25 chamadas de ferramenta sem os testes passarem.

A pessoa também escala, sem nova rodada, quando: acabam as 3 rodadas, duas rodadas seguidas falham pelo mesmo motivo, ou o portão responde `ESCALAR`.

## Resposta final

Termine com, no máximo, cinco linhas: o que mudou (arquivos), o resultado dos quatro comandos e qualquer dúvida sobre a spec.
