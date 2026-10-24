# Estado do loop

Tarefa: [SPEC/2026-10-23-mcp-provedores.md](../SPEC/2026-10-23-mcp-provedores.md). Orçamento: 3 rodadas, cada uma numa sessão nova do Claude Code (`bash loop/rodada.sh <n>`), com até US$ 2 por rodada.

Antes da 1ª rodada, o teste de aceitação falhava nos 3 casos, e o resto (302 testes, `typecheck` e `lint`) passava.

## Rodada 1 (2026-10-23)

- **Sessão:** `d603f4d5-9178-4e84-b086-eba100e70ec2`, Claude Sonnet 5.5, 22 turnos, 146 s, US$ 0,25.
- **O que o agente fez:** criou `src/features/mcp/provedores.ts`, com `nomesPorServico`, que agrupa os provedores por uma chave (caixa baixa, "+" vira "plus", sufixos de plano ou canal removidos) e guarda o nome da primeira ocorrência. Usou a função em `assinatura`, `aluguel`, `compra` e `nos_meus_streamings` de `detalhes_filme`. Rodou os quatro comandos: todos saíram com 0 (305 de 305 testes).
- **Resposta do agente:** `ESCALAR`. O portão respondeu `ESCALAR teste de aceitação alterado`, mas o teste estava intacto. O agente leu o aviso `comm: file 2 is not in sorted order`, identificou que a ordenação do `sort` diferia da baseline e sugeriu `LC_ALL=C`. Não mexeu em `loop/`, que é zona proibida.
- **Decisão do portão:** escalar, como manda a regra. O defeito era meu, no `portao.sh`: a baseline era ordenada pelo nome do arquivo, mas o `comm` compara a linha inteira, que começa pelo hash. Corrigi (`export LC_ALL=C` e `sort` na linha inteira), reordenei a baseline e rodei o portão de novo sobre a mesma árvore, sem nova rodada do agente.
- **Resultado do portão corrigido:** `PASSOU`.

## Fim

O loop parou na rodada 1 com o critério de parada atendido. As rodadas 2 e 3 não foram usadas.
