# Spec: Visão geral da AP2 (evolução do Filme Certo)

- **Data:** 2026-11-17
- **Componente:** visão geral da AP2
- **Status:** aprovada
- **Substitui:** nenhuma. Complementa todas as specs da AP1, que continuam valendo.
- **Fonte dos requisitos:** [docs/ap2/pedido-do-cliente.md](../docs/ap2/pedido-do-cliente.md)

## O quê e por quê

Na AP2, a dupla Leonardo Ribeiro ([@LeoGRibeiro](https://github.com/LeoGRibeiro)) e Lucas Reis ([@Lucas-xps](https://github.com/Lucas-xps)) herda o Filme Certo da dupla Alexsandro Costa e Jonathan Fagundes e trabalha como FDE (Forward Deployed Engineer). Somos donos do negócio e da técnica, e os autores originais são os clientes.

O cliente quer que o app responda "**o que eu vejo hoje à noite?**" em poucos cliques, sem virar catálogo. Esta spec fixa o escopo, a ordem e as decisões que valem para todas as specs da AP2. Cada funcionalidade terá a própria spec datada.

## Princípios (vindos do cliente)

1. **Ajuda a decidir mais rápido? Então serve. Só mostra mais filmes? Então não serve.**
2. Sem catálogo infinito, sem rolagem sem fim e sem novos carrosséis no dashboard.
3. Respostas do wizard da noite **nunca** viram preferência e **nunca** são gravadas junto ao usuário.
4. Sem gamificação: nada de pontos, sequências ou medalhas.
5. **Sem reescrita.** O que funciona fica, e a evolução vem por cima. Refatoração só quando for localizada, justificada numa issue e coberta por teste.

## Escopo e ordem

| Ordem | Pedido | Issue | Spec (a escrever) |
|---|---|---|---|
| 0 | Deploy próprio e medição das métricas da AP2 | #3, #4 | esta spec (seção "Processo e medição") |
| 1 | 3.1 Métricas de uso | #5 | `SPEC/AAAA-MM-DD-metricas.md` |
| 2 | 3.2 Wizard "O que ver hoje?" + 3.4 trailer e "termina às" | #6 | `SPEC/AAAA-MM-DD-wizard-noite.md` |
| 3 | 3.3 "Como foi?" | #7 | `SPEC/AAAA-MM-DD-como-foi.md` |
| 4 | 3.5 Suporte completo a séries | #8 | `SPEC/AAAA-MM-DD-series.md` (pode virar mais de uma) |
| depois | 3.6 "Noite a dois" | #9 | fora do escopo |

Cada entrega vale sozinha. Se o prazo acabar no meio, o que foi entregue continua útil.

## Decisões transversais

| Tema | Decisão |
|---|---|
| Onde fica o código novo | Um módulo por domínio em `src/features/` (`metricas/`, `noite/` para o wizard e o "Como foi?", `series/`), seguindo o padrão da AP1: lógica pura testável separada de `actions.ts`, `consultas.ts` e `gravar.ts`. |
| Cliente TMDB | Estender `src/lib/tmdb/` (tipos, esquemas zod, `FiltrosDescoberta`). Nunca criar um segundo cliente. |
| Estado do wizard | Só na página ou na URL. Nada no banco e nada no `localStorage` que identifique a pessoa. |
| Tipo de mídia | Enum `public.tipo_midia` (`filme`, `serie`), usado em `escolhas_noite`, `reacoes` e `lista_itens`. Valor padrão `filme`. |
| Banco | Só migrations novas em `supabase/migrations/`. Nunca apagar nem recriar tabelas, porque a produção tem dados reais. RLS obrigatória em toda tabela nova. |
| Privacidade dos eventos | Os eventos guardam `usuario_id` e dados técnicos (motivo da troca, origem do trailer). As respostas de clima são contadas numa estrutura sem `usuario_id`. |
| Interface | Identidade visual da AP1 ([2026-10-06-interface](2026-10-06-interface.md)), mobile first, cartões grandes clicáveis. |
| Idioma | Código, nomes e textos em português, como na AP1. |

## Processo e medição

Tudo é extraído do repositório por script. As regras completas estão em [AGENTS.md](../AGENTS.md), e o estado do trabalho está em [TASKS.md](../TASKS.md).

- **Linha de base:** commit `4ac8b98` (último da AP1), com 10.643 linhas no `cloc`. As "linhas novas" são medidas com `cloc --diff` contra ele.
- **No CI:** cobertura de linhas do código novo (≥ 70%), `jscpd` (≤ 5% de duplicação), `gitleaks` e auditoria de dependências críticas.
- **Produção:** `/api/health` informa o SHA do commit servido, para provar que a URL pública serve o último commit da `main`.
- **Custo:** cada sessão em `prompts/sessoes/` tem uma linha em `prompts/custos.md` com tokens e custo estimado.

## Critérios de aceitação da AP2

1. A URL pública responde e serve o último commit da `main`.
2. O CI está verde no último commit da `main`.
3. Cada funcionalidade nova tem spec datada, commitada antes do primeiro commit de código que a cita.
4. Pelo menos 80% dos commits têm os trailers `Agent:` e `Spec:`, e cada integrante tem pelo menos 30% dos commits.
5. Todo merge na `main` acontece por PR aprovado pelo outro integrante.
6. Existe uma sessão em `prompts/sessoes/` para cada dia com commit de agente, e cada sessão tem custo registrado.
7. A cobertura do código novo é de pelo menos 70%, e a duplicação, de até 5%.
8. Não há segredos no histórico nem alertas críticos de dependência.
9. Os critérios de pronto de cada pedido do cliente valem como estão em [docs/ap2/pedido-do-cliente.md](../docs/ap2/pedido-do-cliente.md).

## Fora do escopo

- "Noite a dois" (3.6).
- Séries no dashboard, no motor, no "Me surpreenda", na busca e no MCP.
- Mudanças no servidor MCP, a não ser filtrar `tipo = 'filme'` onde a migration de séries exigir.
- Qualquer código gerado só para aumentar a contagem de linhas.
