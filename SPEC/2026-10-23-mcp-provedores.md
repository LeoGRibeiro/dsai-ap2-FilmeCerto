# Spec: Provedores sem variantes repetidas no MCP

- **Data:** 2026-10-23
- **Componente:** mcp
- **Status:** aprovada para implementação
- **Substitui:** nenhuma (complementa [2026-10-13-mcp.md](2026-10-13-mcp.md))

## O quê e por quê

No teste da aula 6, a tool `detalhes_filme` devolveu variações do mesmo serviço em `onde_assistir.assinatura`: "Netflix" e "Netflix Standard with Ads"; "Paramount Plus", "Paramount+ Amazon Channel" e "Paramount Plus Premium". O TMDB trata cada plano ou canal como um provedor diferente. Para o agente, isso gasta contexto e sugere serviços que não existem.

A tool passa a agrupar as variantes de um mesmo serviço e mostrar um nome só por grupo. Esta é a tarefa que o loop da aula 7 executa ([loop/PROMPT.md](../loop/PROMPT.md)).

## Critérios de aceitação

1. Em `onde_assistir.assinatura`, `aluguel` e `compra`, nomes que só diferem por caixa, por "Plus" no lugar de "+" ou por um sufixo de plano ou canal ("Standard with Ads", "Basic with Ads", "with Ads", "Premium", "Amazon Channel") viram um só.
2. O nome que fica é o da primeira ocorrência na lista do TMDB, e a ordem das listas se mantém.
3. Serviços diferentes continuam separados: "Apple TV" e "Apple TV+" não se juntam.
4. `nos_meus_streamings` usa o mesmo agrupamento: se o usuário marcou qualquer variante, aparece o nome do grupo, uma vez.
5. Os testes de [tests/unit/features/mcp/provedores.test.ts](../tests/unit/features/mcp/provedores.test.ts) passam, junto com `pnpm test`, `pnpm typecheck` e `pnpm lint`.

## Fora do escopo

- Mudar a página do filme no site, que continua mostrando os logos de cada provedor.
- Uma tabela fixa de serviços ou consulta extra ao TMDB.
- Mudar `recomendar_filmes` ou os filtros de streaming do motor.
