# TASKS: plano de trabalho da AP2

> Roteiro de execução da AP2, na ordem de prioridade do [pedido do cliente](docs/ap2/pedido-do-cliente.md). As regras estão no [AGENTS.md](AGENTS.md) e valem para tudo aqui. Atualize este arquivo no fim de cada sessão: marque o que foi concluído e deixe claro o próximo passo.

## Situação atual

### Concluído

- [x] **Fork e repositório:** issues e Actions ativadas, dupla com permissão de escrita, `main` protegida (PR com 1 aprovação e check `verificar`, só _merge commit_), rótulos e issues #2 a #9.
- [x] **Linha de base:** `4ac8b98` = 10.643 linhas (`cloc`), 305 testes unitários verdes.
- [x] **Documentos da AP2** (PRs #1 e #11): pedido do cliente, [visão geral](SPEC/2026-11-17-visao-geral-ap2.md), AGENTS.md e este arquivo.
- [x] **Deploy (#3, PR #10):** <https://dsai-ap2-filme-certo.vercel.app>, Vercel ligada à `main`, Supabase `ndugdhtzdjweqvwjwvxy`. O `/api/health` devolve o SHA servido.
- [x] **Processo (PR #12):** checklist da seção 0 do AGENTS.md, hooks `pre-commit` e `commit-msg` em `.githooks/` e `prompts/custos.md` com todas as sessões.
- [x] **Métricas de uso (#5, PR #13):** spec [2026-11-18-metricas.md](SPEC/2026-11-18-metricas.md), tabelas `eventos`, `contagem_climas` e `equipe_metricas`, `POST /api/eventos` e a página `/metricas`.
- [x] **Wizard, lógica (#6, PR #14):** spec [2026-11-18-wizard-noite.md](SPEC/2026-11-18-wizard-noite.md) com as tabelas de mapeamento e `src/features/noite/` (filtros, estado na URL, motivo, "termina às", `obterNoite`, `concluirNoite`). As telas estão no PR #20 (branch A).
- [x] **"Como foi?" (#7, PR #15):** spec [2026-11-18-como-foi.md](SPEC/2026-11-18-como-foi.md), enum `tipo_midia`, tabela `escolhas_noite`, componentes `VouVerEsse` e `PerguntaComoFoi` (o cartão já aparece no dashboard).
- [x] **Produção em dia:** as migrations `metricas` e `escolhas_noite` foram aplicadas com `supabase db push`. A conta do Leonardo está em `equipe_metricas`.
- [x] **Plano até a entrega, implementado (18 e 19/11):** uma sessão orquestrou um agente por branch, cada um num worktree próprio. Os PRs abaixo foram mesclados na `main` em 19/11, na ordem da tabela (o F é o PR #30).

| Ordem | Branch                     | PR       | Issue       | Spec                                                          | Migration nova                             |
| ----- | -------------------------- | -------- | ----------- | ------------------------------------------------------------- | ------------------------------------------ |
| P     | `docs/plano-entrega`       | #16      | —           | visão geral                                                   | —                                          |
| G     | `feat/metricas-funil`      | #18      | Closes #17  | [metricas-funil](SPEC/2026-11-18-metricas-funil.md)           | `20261118181500_metricas_detalhes`         |
| M     | `chore/medicao`            | #19      | Parte de #4 | visão geral                                                   | —                                          |
| A     | `feat/noite-telas`         | #20      | Closes #6   | [wizard-noite](SPEC/2026-11-18-wizard-noite.md)               | —                                          |
| B     | `feat/series-base`         | #21      | Parte de #8 | [series-base](SPEC/2026-11-18-series-base.md)                 | `20261118224000_tipo_midia_reacoes_listas` |
| H     | `feat/noite-ate-que-horas` | #23      | Closes #22  | [noite-ate-que-horas](SPEC/2026-11-18-noite-ate-que-horas.md) | —                                          |
| C     | `feat/series-pagina`       | #24      | Parte de #8 | [series-pagina](SPEC/2026-11-18-series-pagina.md)             | —                                          |
| I     | `feat/noite-compartilhar`  | #26      | Closes #25  | [noite-compartilhar](SPEC/2026-11-18-noite-compartilhar.md)   | —                                          |
| D     | `feat/series-noite`        | #28      | Closes #8   | [series-noite](SPEC/2026-11-18-series-noite.md)               | —                                          |
| J     | `feat/noite-a-dois`        | #29      | Closes #9   | [noite-a-dois](SPEC/2026-11-18-noite-a-dois.md)               | `20261118233000_salas_noite`               |
| F     | `docs/entrega-ap2`         | (último) | Closes #27  | visão geral                                                   | —                                          |

- A D já traz a H e a I por `git merge`, e a J já traz a D, então os PRs de cima não conflitam com os de baixo. A sequência completa (P a J) foi mesclada numa cópia local, na ordem: sem conflito, typecheck, lint e testes unitários verdes.
- O que cada branch deixou de fora está na seção "Fora do escopo" da spec dela e no corpo do PR.

- [x] **Séries, como chegar nelas (#33, PR #35, 19/11):** spec [2026-11-19-series-descoberta.md](SPEC/2026-11-19-series-descoberta.md). Seção "Séries para hoje à noite" no dashboard, aba "Séries" na busca por nome, página `/serie/{id}/temporada/{n}` com os episódios, situação da série, tempo de cada temporada e trailer de série no funil. Nenhuma migration. A parte A foi feita direto na branch e as partes B, C e D por um agente cada, em worktrees (`feat/series-descoberta-{dashboard,busca,episodios}`), mescladas na `feat/series-descoberta` com merge commits. Mesclado em 19/11. Ampliou o escopo do pedido 3.5: a pergunta ao cliente está na #33.
- [x] **"Até que horas?" relativo (#31, PR #32, 19/11):** spec [2026-11-19-noite-tempo-disponivel.md](SPEC/2026-11-19-noite-tempo-disponivel.md). 1h30 a 3h a partir de agora e outro horário no seletor.
- [x] **Acessibilidade do wizard (PR #36, Lucas, 20/11):** spec [2026-11-20-acessibilidade-wizard-noite.md](SPEC/2026-11-20-acessibilidade-wizard-noite.md). Foco no primeiro motivo do "Esse não" e no título do "Já vi".
- [x] **Revisão do estado (23/11, branch `docs/entrega-24-11`):** issues #2 (perguntas ao cliente, respondidas com as decisões das specs) e #4 (medição, feita no PR #19) fechadas com comentário. README com o `cloc` de 23/11 e as specs novas, prazo corrigido para **24/11** no AGENTS.md e hook `commit-msg` lendo os trailers como o git.
- [x] **Navegação lenta (#42, PR #43, 23/11, branch `fix/navegacao-rapida`):** spec [2026-11-23-navegacao-rapida.md](SPEC/2026-11-23-navegacao-rapida.md). Medido na produção: cada clique levava de 0,5 s a 1,8 s para trocar a tela, sem retorno visual. Causas: nenhuma rota de `(app)` tinha `loading.tsx` (o Next 16 não pré-carrega rota dinâmica sem ele), proxy e header chamavam `getUser()` (ida ao Auth) a cada requisição. Correção: `loading.tsx` com esqueleto em todas as rotas, `getClaims()` no proxy e em `obterUsuarioAtual` e layout de `(app)` em paralelo. A busca com `next/form` quebrou 3 E2E no CI e foi desfeita (ver "Fora do escopo" da spec). **Falta:** depois do merge, refazer a medição na produção e comentar na #42 (critério 8 da spec).

### Situação dos critérios em 23/11 (`main` em `324ee55`)

| Critério                        | Mínimo     | Medido                                                           |
| ------------------------------- | ---------- | ---------------------------------------------------------------- |
| Linhas novas (`cloc --diff`)    | 100 mil    | 12.996 (5.469 da aplicação e 7.527 de testes): abaixo            |
| Parcela de commits do Lucas     | 30%        | 13 de 178 (7%): abaixo                                           |
| Trailers (parser do git)        | 80%        | 144 de 178 (80,9%); pelo `grep`, 169 de 178                      |
| Spec antes do código            | 100%       | 13 de 13 specs da AP2, cada uma num commit só dela               |
| Mediana do tamanho dos commits  | < 400      | 113                                                              |
| Cobertura das linhas novas      | 70%        | 92,7%                                                            |
| Duplicação (`jscpd`)            | 5%         | 1,0%                                                             |
| CI                              | verde, 80% | `main` verde; 55 de 58 builds verdes                             |
| URL pública, segredos, críticos | —          | `/api/health` = `324ee55`; 0 críticos; 10 migrations na produção |

### Próximo passo (entrega em 24/11)

1. **Lucas:** revisar e mesclar pelo terminal os PRs abertos (#41 e #43; o #39 ainda é rascunho), com trailers na mensagem do merge (nunca pelo botão: os merges dos PRs #32, #35 e #36 saíram sem trailers).
2. **Depois do merge do #43:** medir de novo na produção, com a sessão logada no navegador, o tempo do clique até a tela trocar (`/listas`, `/dashboard`, `/noite` e as respostas do wizard) e o tempo da requisição RSC de `/sobre`. Meta da spec: menos de 100 ms com o link pré-carregado e `/sobre` abaixo de 400 ms. Comentar o resultado na #42.
3. **Lucas, se der tempo:** trabalho real com a conta dele, em commits pequenos e com os trailers no último parágrafo. Cada commit dele melhora a parcela de autoria.
4. **No fim:** `/api/health` com o SHA da `main`, CI verde na `main` e a autoverificação da seção 0 do AGENTS.md.

### Pendente de configuração manual

- [ ] Confirmar no Supabase, em Authentication > URL Configuration: Site URL `https://dsai-ap2-filme-certo.vercel.app` e Redirect URLs `https://dsai-ap2-filme-certo.vercel.app/**`.
- [ ] Liberar o `/metricas` para o Lucas e os clientes: a pessoa cria conta no site e alguém roda no SQL Editor:
      `insert into public.equipe_metricas (usuario_id) select id from auth.users where email = '<e-mail>' on conflict do nothing;`
- [ ] Previews da Vercel quebrados: o ambiente **Preview** não tem `NEXT_PUBLIC_SUPABASE_URL` nem `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (o preview do PR #43 deu `EnvError` em 23/11). Para testar um PR antes do merge, copiar as variáveis de Production para Preview no painel da Vercel.
- [ ] Depois do merge de cada PR com migration nova: `pnpm exec supabase db push` (confira antes com `--dry-run`). Em 23/11, `supabase migration list --linked` mostrou as 10 migrations aplicadas.

## Plano até a entrega

### Quem faz o quê

| Papel                                        | Quem                                 |
| -------------------------------------------- | ------------------------------------ |
| Implementa as branches abaixo                | Leonardo, com agentes do Claude Code |
| Revisa, aprova e mescla os PRs pelo terminal | Lucas                                |

### Mapa das branches

```
main ─┬─ G  feat/metricas-funil
      ├─ M  chore/medicao
      ├─ A  feat/noite-telas ─ H feat/noite-ate-que-horas ─ I feat/noite-compartilhar ─ J feat/noite-a-dois
      └─ B  feat/series-base ─ C feat/series-pagina ─ D feat/series-noite (recebe a A com git merge)
                                                          F docs/entrega-ap2 (por último)
```

- **Primeira leva, em paralelo:** G, M, A e B (todas a partir da `main`).
- **Segunda leva:** H, C e I.
- **Terceira leva:** D e J. A J é a maior; se o tempo apertar, ela fica para depois.
- **Por último:** F.

**Ordem de merge:** P (`docs/plano-entrega`, só este arquivo, para o plano chegar à `main` antes de tudo), G, M, A, B, H, C, I, D, J, F. Os PRs são abertos nessa ordem, então o Lucas mescla do menor número para o maior. Cada merge só depois do anterior entrar e do CI ficar verde.

### Regras de cada branch

1. **Issue primeiro.** As branches A, B, C e D usam as issues que já existem (#6 e #8), a M usa a #4 e a J usa a #9. As outras precisam de issue nova; as que não estão no pedido (G, H, I) levam também o rótulo `pergunta-cliente`.
2. **Uma spec por branch**, em `SPEC/2026-11-18-<slug>.md` (com a data do dia em que for escrita), no formato da seção 4 do AGENTS.md. Ela vai num **commit que só tem a spec**, antes de qualquer código. A M e a F são de processo e citam a [visão geral](SPEC/2026-11-17-visao-geral-ap2.md).
3. **Depois, commits pequenos de implementação** (menos de 400 linhas cada), um por passo lógico (migration, lógica, action, tela), sempre com o teste junto e com `Agent:` e `Spec:` apontando a spec da branch.
4. **Qualidade antes de quantidade.** Antes do PR: `pnpm lint && pnpm typecheck && pnpm test && pnpm check:secrets` e `pnpm build` com saída 0. Teste o fluxo no `pnpm dev`, também em tamanho de celular. Trate os casos ruins: TMDB fora do ar, nenhum resultado, pessoa sem preferências. Melhor entregar menos funcionando do que mais quebrado. Nada de código só para aumentar linhas.
5. **PR com `--base main`**, `Closes #N`, a spec e a frase "Depende do PR #X" quando a branch sair de outra. Depois do push, `gh run watch` até o CI ficar verde (integração e E2E só rodam lá).
6. **Correção numa branch de baixo** passa para as de cima com `git merge`. Nunca rebase, amend em commit publicado ou force push.
7. **Só as branches P e F mexem neste arquivo.** As outras não editam o TASKS.md, para não dar conflito.
8. **Ninguém mescla o próprio trabalho.** Quem implementa não usa `gh pr merge`.

### Orquestração com agentes

- A sessão que orquestra é uma conversa nova do Claude Code, que será registrada em `prompts/sessoes/`.
- No máximo 4 agentes ao mesmo tempo, cada um num worktree próprio e numa branch só.
  - Como foi feito (18 e 19/11): os worktrees ficaram em `../ap2-wt/<letra>`, criados à mão com `git worktree add`, porque o isolamento automático do Claude Code recusou o caminho no Windows (`c:\` contra `C:/`). Cada branch começou quando a base dela ficou pronta. O limite de uso de 5 horas da conta parou os agentes duas vezes, e eles foram retomados do ponto em que pararam.
- O agente de cada branch recebe o cartão dela (abaixo) e as regras acima, e devolve: número do PR, estado do CI e o que ficou de fora.
- No fim da sessão, a branch F recebe, em commits separados: o TASKS.md atualizado; a exportação da sessão principal **e das transcrições dos subagentes** (pasta `subagents/` da sessão), depois de procurar segredos; e a linha em `prompts/custos.md` com os tokens somados, incluindo os subagentes.

## Cartões das branches

### G: `feat/metricas-funil` (base: `main`)

**Pedido:** 3.1 (evidência de uso). **Spec:** `metricas-funil`.

- No `/metricas`, mostrar o funil do wizard: iniciados → concluídos → escolheram, com a porcentagem de cada etapa. Também as trocas por motivo, as respostas do "Como foi?" e os trailers por origem.
- Reaproveitar as funções `metricas_eventos`/`metricas_climas` e `obterMetricas`. Se precisar de função SQL nova, ela vai numa migration nova, com o mesmo controle por `equipe_metricas`.
- Sem biblioteca de gráficos pesada; números e barras simples.
- Testes: cálculo do funil (lógica pura, inclusive com zero eventos) e a página.

### M: `chore/medicao` (base: `main`, issue #4)

**Spec:** visão geral (processo).

- Cobertura no CI com `@vitest/coverage-v8` (projeto `unit`), gerando `lcov`, e a cobertura do diff contra `origin/main`.
- `jscpd` com limite de 5% (`.jscpd.json`, ignorando `tests/e2e/tmdb-falso` e `database.types.ts`).
- `gitleaks` e `pnpm audit --audit-level critical` no CI.
- `scripts/custo-sessao.mjs`: soma `message.usage` de um `.jsonl` (e dos subagentes), contando cada `message.id` uma vez, e imprime a linha de `prompts/custos.md`. Teste com uma fixture que tenha `message.id` repetido.

### A: `feat/noite-telas` (base: `main`, issue #6)

**Pedido:** 3.2 e 3.4. **Spec:** a já existente [2026-11-18-wizard-noite.md](SPEC/2026-11-18-wizard-noite.md). Se precisar ajustar, editar a spec num commit só dela.

1. `/noite` em `ROTAS_PROTEGIDAS` (`src/proxy.ts`) e `src/app/(app)/noite/page.tsx`: `exigirUsuario`, preferências (sem elas, `/onboarding`), `lerEstado(await searchParams)`. Sem as três respostas, mostra `proximaPergunta(estado)` com um cartão grande por opção (rótulos em `ROTULOS_CLIMA`), cada um um `Link` para `urlComResposta(...)`, e "Voltar" com `router.back()`. Com as três, `obterNoite(respostasCompletas(estado), estado, preferencias)`; `null` vira "Não achamos nada para essa noite" com "Refazer as perguntas".
2. Botão de destaque "O que ver hoje?" no topo do dashboard, link para `/noite` (1 clique + 3 respostas = 4 cliques).
3. Resultado: pôster, título, ano, `formatarDuracao`, motivo, provedor, "Começando agora, termina às {terminaAs(new Date(), duracaoMin)}" (calculado só no navegador) e `<Trailer origem="noite">`. Na rodada 0, chamar `concluirNoite(respostas)` uma vez.
4. "Esse não" → motivo (`MOTIVOS_TROCA`) → `enviarEvento({ nome: "wizard_troca", dados: { motivo } })` e `router.push(urlDaNoite(proximaRodada(estado, motivo, mostrados)))`. `null` (limite) troca o botão por "Refazer as perguntas". "Já vi" oferece marcar "Já assisti" (`alternarLista`). Mostrar "trocas restantes".
5. "Vou ver esse!" no destaque e em cada opção, com `<VouVerEsse tmdbId titulo trocas aoEscolher />` de `src/features/como-foi/components/vou-ver-esse.tsx`.
6. `wizard_iniciado` ao abrir `/noite` sem respostas; `wizard_abandonado` no `pagehide` sem escolha (`etapa`: `perguntas` ou `resultado`).
7. Testes: unitários dos componentes e `tests/e2e/noite.spec.ts`: 4 cliques, "Voltar", troca com 3 opções sem repetir, limite de trocas, família só com "Para a família", `/perfil` igual depois.

### B: `feat/series-base` (base: `main`, issue #8)

**Pedido:** 3.5. **Spec:** `series-base`.

- Migration nova: coluna `tipo public.tipo_midia not null default 'filme'` em `reacoes` e `lista_itens` (o enum já existe), e a chave trocada para `(usuario_id, tipo, tmdb_id)` com `drop constraint` / `add primary key`, **sem recriar as tabelas**. Atualizar `database.types.ts` à mão.
- Revisar tudo o que lê essas tabelas (motor, dashboard, "Me surpreenda", listas, MCP) e filtrar `tipo = 'filme'` onde só se espera filme.
- TMDB: `obterSerie`, `descobrirSeries` e gêneros de TV (`/genre/tv/list`), com esquemas zod em `src/lib/tmdb/`, estendendo o cliente existente. Respostas novas no TMDB falso (`tests/e2e/tmdb-falso/`).
- Testes: integração da migration (dados antigos continuam válidos como `filme`, o mesmo `tmdb_id` como filme e como série convivem, RLS) e unitários do cliente TMDB.

### C: `feat/series-pagina` (base: B)

**Pedido:** 3.5. **Spec:** `series-pagina`.

- Página `/serie/[id]`: sinopse, temporadas, duração média do episódio, elenco, onde assistir e trailer (reaproveitar `Trailer`).
- Reações e listas aceitam séries (`definirReacao` e as actions de lista recebem `tipo`).
- Testes: unitários das actions com `tipo` e E2E da página da série.

### H: `feat/noite-ate-que-horas` (base: A)

**Pedido:** 3.2 e 3.4 (o "termina às"). **Spec:** `noite-ate-que-horas`.

- Pergunta opcional no wizard: "Até que horas?" (ex.: 22h, 23h, meia-noite, "tanto faz"). O wizard só sugere o que termina antes dessa hora, limitando a duração máxima pelo horário atual da pessoa.
- A resposta fica só na URL, como as outras. Dá para pular, então não aumenta os cliques obrigatórios.
- Testes: cálculo da duração máxima (inclusive a virada da meia-noite) e o filtro aplicado.

### I: `feat/noite-compartilhar` (base: H)

**Pedido:** 3.2 (fechar a noite com quem vai assistir). **Spec:** `noite-compartilhar`.

- Depois do "Vou ver esse!", um botão "Compartilhar" com a mensagem "Hoje vamos ver {título}, termina às {hora}" e o link da página do filme. Usa a Web Share API e, sem ela, um link do WhatsApp.
- Não grava nada novo no banco.
- Testes: montagem da mensagem e o caminho sem Web Share.

### D: `feat/series-noite` (base: C, com `git merge` da A)

**Pedido:** 3.2 (pergunta 1) e 3.5. **Spec:** `series-noite`.

- A pergunta "Filme ou série?" volta para o começo do wizard. Para série, mapeamento próprio de gêneros de TV (tabela na spec) e o resultado mostra a duração do episódio.
- "Como foi?" funciona para séries (`escolhas_noite.tipo`), gravando a reação e a lista com o tipo certo.
- Testes: mapeamento de série, "Como foi?" de série e E2E do wizard com "Série".

### J: `feat/noite-a-dois` (base: I, issue #9)

**Pedido:** 3.6. **Spec:** `noite-a-dois`, dizendo que amplia o escopo da [visão geral](SPEC/2026-11-17-visao-geral-ap2.md).

- No wizard, "Vamos escolher juntos" cria uma sala e gera um link. Cada pessoa responde no próprio celular; quando as duas respondem, o app sugere um filme que agrade às duas, com um motivo do tipo "um quer rir, o outro quer tensão: comédia de ação".
- Tabela nova com RLS (só os dois participantes leem a sala) e expiração. As respostas da sala não viram preferência e deixam de valer depois do resultado.
- Testes: combinação das respostas (lógica pura), RLS da sala e E2E com dois contextos do Playwright.

### F: `docs/entrega-ap2` (base: `main`, por último)

**Spec:** visão geral (processo).

- README da AP2: URL, dupla, o que mudou, como rodar, ferramentas e modelos, saída do `cloc --diff` contra `4ac8b98` (com as linhas de teste separadas).
- Este arquivo atualizado e os registros das sessões e dos custos (commits separados).
- Checklist final: CI verde na `main`, `/api/health` com o último SHA, `supabase db push` feito, sessões e custos registrados, nenhum segredo, todas as specs antes do código, e a autoverificação da seção 0 do AGENTS.md.

## Como o Lucas mescla cada PR

Depois de revisar e aprovar no GitHub, e com o CI verde:

```bash
git switch main && git pull --ff-only
gh pr merge <N> --merge \
  --subject "Merge pull request #<N>: <título do PR>" \
  --body "<resumo em uma linha>

Agent: none
Spec: SPEC/<spec do PR>.md"
git switch main && git pull --ff-only
```

Se o PR trouxer migration nova, rodar `pnpm exec supabase db push` logo depois. **Nunca mesclar pelo botão do GitHub:** o merge sai sem trailers.

## Pontos de atenção

- **Migrations e RLS** só são validadas no CI (Supabase local em Docker). Fazer push cedo e acompanhar com `gh run watch`.
- **CI com `supabase/setup-cli`:** em `version: latest` ele falhou algumas vezes por limite da API do GitHub, antes de rodar qualquer teste (`gh run rerun <id> --failed` resolve). O PR #19 fixa a versão em 2.119.0.
- **Parcela de commits de cada integrante (mínimo de 30%):** em 19/11, todos os 125 commits da AP2 (49 na `main` e 76 nos PRs abertos) são do Leonardo. Os 11 merges do Lucas levam a parcela dele a cerca de 8%. Só trabalho real do Lucas, com a conta dele, muda isso (nunca `--author` nem `Co-authored-by`).
- **Parcela, 23/11:** 13 de 178 commits são do Lucas (2 sem contar merges). O merge `a9d65e6` saiu com autor "Seu Nome", de um git sem `user.name`, e não conta para ninguém: confira `git config user.name` antes de commitar.
- **Trailers (mínimo de 80%):** em 23/11, 169 de 178 pelo `grep` e só 144 de 178 pelo parser do git. Os 9 sem trailers são merges pelo botão do GitHub (#1, #10, #11, #13, #14, #15, #32, #35 e #36). Os outros 25 têm os trailers num formato que o git não reconhece: `Co-Authored-By` num parágrafo depois do `Agent:`/`Spec:` (sessão de 19/11) ou linha em branco entre os dois (commits do PR #36). O hook agora recusa esses formatos.
- **Duplicação:** o `jscpd` do CI mede só código (1,03%). No repositório inteiro, sem o lockfile e sem `prompts/`, dá 5,24%, quase tudo por causa do plano da AP1 `docs/superpowers/plans/2026-10-13-mcp.md`, que copia o código do MCP. Mexer nesse arquivo é decisão da dupla.
- **Telas logadas sem Docker:** sem Supabase local, as telas novas foram verificadas por testes de componente e pelos E2E no CI (com um teste em 390x844 em cada fluxo), não a olho. Vale uma passada manual no celular depois do deploy.
- **Nada do wizard vira preferência.** Toda resposta (inclusive "até que horas" e as da noite a dois) fica na URL ou deixa de valer depois do resultado.
