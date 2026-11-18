# TASKS: plano de trabalho da AP2

> Roteiro de execução das issues da AP2, na ordem de prioridade do [pedido do cliente](docs/ap2/pedido-do-cliente.md). As regras de processo estão no [AGENTS.md](AGENTS.md). Atualize este arquivo no fim de cada sessão: marque o que foi concluído e deixe claro o próximo passo.

## Situação atual

### Concluído

- [x] Fork configurado: issues e Actions ativadas, dupla com permissão de escrita.
- [x] `main` protegida: PR com 1 aprovação e check `verificar` obrigatório, sem force push nem exclusão. Merge só por *merge commit*; a branch é apagada após o merge.
- [x] Rótulos: `pedido-cliente`, `infra`, `processo`, `pergunta-cliente`, `depois`.
- [x] Issues: #2 Primeiras impressões (com perguntas ao cliente), #3 deploy, #4 medição, #5 métricas, #6 wizard, #7 "Como foi?", #8 séries, #9 "Noite a dois".
- [x] Linha de base medida: `4ac8b98` = 10.643 linhas (`cloc`), 305 testes unitários verdes, lint e typecheck limpos.
- [x] Projeto do Supabase da dupla ativo.
- [x] **Passo 1:** documentos da AP2 em 4 commits separados (PR #1). O PR #1 foi mesclado por engano na `feat/dsai-ap2`; os documentos chegaram à `main` pelo PR #11. A branch `feat/dsai-ap2` foi apagada.
- [x] **Passo 2 (#3):** deploy próprio no ar em **<https://dsai-ap2-filme-certo.vercel.app>** (PR #10).
  - Vercel: projeto `dsai-ap2-filme-certo` ligado ao fork pelo app da Vercel no GitHub, produção a partir da `main`, variáveis de produção `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `TMDB_READ_TOKEN`.
  - Supabase: projeto `FilmeCerto` (`ndugdhtzdjweqvwjwvxy`) linkado pelo CLI. O schema das 5 migrations da AP1 já existia (criado pelo editor SQL) e o histórico foi acertado com `supabase migration repair --status applied`; o próximo `db push` aplica só migrations novas.
  - `/api/health` devolve `{ status, commit }`; a produção respondeu com o SHA do merge do PR #10 (`5374335`).
  - README aponta para a URL nova e o CI do fork.
- [x] **Processo reforçado** (branch `chore/processo`):
  - O AGENTS.md ganhou a seção 0, um checklist obrigatório de início de sessão, commit, PR, merge e encerramento, com um comando de autoverificação.
  - Hooks em `.githooks/`: `pre-commit` bloqueia commit na `main` e `commit-msg` exige `Agent:` e `Spec:`, com a spec existente. São ativados pelo `prepare` do `pnpm install`.
  - `prompts/custos.md` agora tem todas as sessões: a do Antigravity de 28/10 e as 7 da AP1.
  - **Merges só pelo terminal, com trailers** (AGENTS.md, seção 0). Os merges dos PRs #1, #10 e #11 foram feitos pelo botão do GitHub e ficaram sem trailers (10 de 13 commits, 77%). Os próximos commits e merges, todos com trailers, devolvem a taxa para acima de 80%.

- [x] **Passo 4 (#5):** métricas de uso no PR #13 (branch `feat/metricas`), com a spec [2026-11-18-metricas.md](SPEC/2026-11-18-metricas.md).
  - Migration `20261118120000_metricas.sql`: `eventos` (só insert), `contagem_climas` (anônima, por dia e por pergunta), `equipe_metricas` e as funções `registrar_clima`, `metricas_eventos` e `metricas_climas`. SQL validado no PGlite; a RLS é testada no CI (`tests/integration/metricas/`).
  - `src/features/metricas/`: `eventoSchema`, `registrarEvento` e `registrarClima` (servidor, nunca lançam), `enviarEvento` (navegador, `sendBeacon` para `POST /api/eventos`), `obterMetricas` e a página `/metricas`.
  - `trailer_aberto` já é emitido na página do filme (`<Trailer origem="filme">`).
  - **Falta:** aprovação do Lucas, merge pelo terminal e, depois do merge, `pnpm exec supabase db push` e o `insert` em `equipe_metricas` com os e-mails da dupla e dos clientes (SQL na spec). Conferir `/metricas` em produção.

- [x] **Passo 5 (#6), parte do Leonardo:** spec e lógica do wizard na branch `feat/wizard-noite`, criada a partir da `feat/metricas`. O PR **depende do #13** e só pode ser mesclado depois dele (enquanto o #13 não entra, o diff do PR mostra os commits das métricas também).
  - Spec [2026-11-18-wizard-noite.md](SPEC/2026-11-18-wizard-noite.md), com as tabelas de mapeamento (tons por experiência, ajustes de humor e companhia, precedência). Família = classificação até 12 (proposta da #2, sem resposta ainda).
  - `FiltrosDescoberta`: `todosGeneros` (AND), `classificacaoMax` e `lancadoAte`. O TMDB falso devolve "Para a família N" com `certification.lte`.
  - `src/features/noite/`: `filtrosDaNoite`, estado na URL (`lerEstado`, `urlDaNoite`, `urlComResposta`, `proximaPergunta`, `respostasCompletas`, `proximaRodada`), `motivoDaNoite`/`provedorDaNoite`, `terminaAs`, `recomendarNoite`, `obterNoite` e a action `concluirNoite`.
  - **Falta (Lucas, telas):** ver o passo 5 abaixo.

### Pendente de configuração manual

- [ ] Confirmar no Supabase, em Authentication > URL Configuration: Site URL `https://dsai-ap2-filme-certo.vercel.app` e Redirect URLs `https://dsai-ap2-filme-certo.vercel.app/**` (sem isso o login não volta para o site).
- [ ] Ambiente local de cada integrante: `.env.local` a partir do `.env.example`, com as duas variáveis `NEXT_PUBLIC_*` do Supabase, que são públicas, e um `TMDB_READ_TOKEN` próprio, criado em themoviedb.org > Settings > API. Lint, typecheck e testes unitários não precisam do arquivo.

## Responsáveis

| Issue | Responsável |
|---|---|
| #1 Diretrizes (PR) | Leonardo (revisão: Lucas) |
| #3 Deploy | Leonardo |
| #4 Medição no CI | Lucas |
| #5 Métricas de uso | Leonardo |
| #6 Wizard: lógica e filtros | Leonardo |
| #6 Wizard: telas | Lucas |
| #7 "Como foi?" | Lucas |
| #8 Séries: migration e TMDB | Leonardo |
| #8 Séries: página `/serie/[id]` | Lucas |
| README e entrega | os dois |

Cada PR é revisado e aprovado pelo outro integrante.

## Passos

> **Próximos:** passo 3 (Lucas, #4); revisão e merge do PR #13 (passo 4) e depois o PR do wizard; passo 5, telas (Lucas, numa branch a partir da `feat/wizard-noite`); passo 7, migration e TMDB de séries (Leonardo).

### Passo 1: documentos da AP2, PR #1 (concluído)

Na branch `docs/diretrizes-ap2`, commitar os documentos em **commits separados**, todos com `Spec: SPEC/2026-11-17-visao-geral-ap2.md`:

1. `docs(ap2): transcreve o pedido do cliente` (`docs/ap2/pedido-do-cliente.md` + `.gitignore`);
2. `docs(spec): adiciona visão geral da AP2` (só a spec);
3. `docs(agents): diretrizes completas da AP2` (`AGENTS.md`);
4. `docs(tasks): plano de trabalho da AP2` (`TASKS.md`).

Depois: push, atualizar a descrição do PR #1 (`gh pr edit 1`), acompanhar o CI (`gh run watch`), revisão e merge.

### Passo 2: deploy próprio, #3 (concluído)

1. Aplicar as migrations no Supabase da dupla: `pnpm exec supabase login`, `pnpm exec supabase link --project-ref <ref>` e `pnpm exec supabase db push`.
2. Criar o projeto na Vercel ligado ao fork, com produção a partir da `main` (`vercel link` e `vercel git connect`, ou pelo dashboard). Variáveis de produção com `vercel env add`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `TMDB_READ_TOKEN`.
3. Fazer `/api/health` devolver `{ status, commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null }`, com teste unitário. O commit cita a spec de visão geral.
4. Pôr a URL nova no README.

### Passo 3: medição no CI, #4 (Lucas, próximo)

Na branch `chore/medicao`:

- `@vitest/coverage-v8`, com cobertura do projeto `unit` no CI. Para a cobertura do diff: gerar `lcov` e comparar com `git diff origin/main` (`diff-cover` via `pipx`, ou um script Node pequeno).
- `jscpd` com limite de 5% (`.jscpd.json`, ignorando `tests/e2e/tmdb-falso` e `database.types.ts` se necessário).
- `gitleaks/gitleaks-action` e `pnpm audit --audit-level critical` no CI.
- `prompts/custos.md` já existe, com todas as sessões somadas à mão. Falta transformar essa soma em `scripts/custo-sessao.mjs`: ler o `.jsonl` do Claude Code (e os de subagentes, se houver), somar `message.usage` das mensagens do assistente (`input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`) contando cada `message.id` uma vez só, e imprimir a linha da tabela. Testar com um `.jsonl` de fixture que tenha `message.id` repetido.
- A extensão do VS Code não tem `/cost`: a coluna de custo fica "não disponível (extensão VS Code)", e os tokens bastam para o critério.

### Passo 4: métricas de uso, #5 (Leonardo, PR #13 em revisão)

Spec [`SPEC/2026-11-18-metricas.md`](SPEC/2026-11-18-metricas.md). Desenho original (a spec é a referência; mudanças: climas contados **por pergunta**, não pela combinação, e uma rota `POST /api/eventos` única para o navegador):

- Migration `eventos`: `id bigint identity`, `usuario_id uuid not null default auth.uid()` (referência a `auth.users`, com cascade), `nome text` (com `check` na lista fechada de eventos), `dados jsonb default '{}'` e `criado_em`. RLS **só de insert** com `usuario_id = auth.uid()`, sem select.
- **Climas anônimos:** tabela `contagem_climas (dia date, humor, experiencia, companhia, total int)`, sem `usuario_id`, incrementada por uma função `security definer` (`registrar_clima`). A granularidade é **diária**, para o horário não permitir cruzar com `wizard_concluido`.
- **Totais:** função `security definer` `metricas_totais()` que só responde se `auth.uid()` estiver em `equipe_metricas`, uma tabela sem políticas, preenchida à mão com os IDs da dupla e dos clientes. A página `/metricas` usa essa função. A consulta SQL equivalente fica documentada na spec. Os totais podem excluir as contas de teste da dupla.
- `src/features/metricas/registrar.ts`: `registrarEvento(supabase, nome, dados)` não lança erro e nunca quebra a tela. Os eventos do navegador (`trailer_aberto`, `wizard_abandonado` no `pagehide`) usam uma server action ou `POST /api/eventos` com `navigator.sendBeacon`.
- `trailer_aberto`: o `Trailer` ganha uma prop opcional `origem` e registra o evento no clique. É uma mudança localizada e precisa de teste.
- Testes: unitários do registro e da página, e de integração da RLS (não dá para ler eventos, não dá para inserir com o `usuario_id` de outra pessoa, a contagem fica sem usuário).

### Passo 5: wizard "O que ver hoje?" + trailer e "termina às", #6

**Lógica concluída (Leonardo).** A spec [2026-11-18-wizard-noite.md](SPEC/2026-11-18-wizard-noite.md) é a referência; ela ajustou o rascunho abaixo (tons por experiência com "Não é o clima" avançando o tom, família sem excluir Terror porque a classificação já protege, todas as reações excluídas, "Quero assistir" não). **Falta, telas (Lucas)**, numa branch a partir da `feat/wizard-noite`, citando a mesma spec:

1. `/noite` em `ROTAS_PROTEGIDAS` (`src/proxy.ts`) e `src/app/(app)/noite/page.tsx`: `exigirUsuario`, preferências (sem elas, `/onboarding`), `lerEstado(await searchParams)`. Sem as três respostas, mostra `proximaPergunta(estado)` com um cartão grande por opção (rótulos em `ROTULOS_CLIMA`), cada um um `Link` para `urlComResposta(...)`, e "Voltar" com `router.back()`. Com as três, `obterNoite(respostasCompletas(estado), estado, preferencias)`; `null` vira "Não achamos nada para essa noite" com "Refazer as perguntas" (`/noite`).
2. Botão de destaque "O que ver hoje?" no topo do dashboard, link para `/noite` (1 clique + 3 respostas = 4).
3. Resultado (componente do navegador): pôster, título, ano, `formatarDuracao`, motivo, provedor, "Começando agora, termina às {terminaAs(new Date(), duracaoMin)}" (só no navegador), `<Trailer origem="noite">`. Na rodada 0, chamar `concluirNoite(respostas)` uma vez (`useEffect` com ref).
4. "Esse não" → escolha do motivo (`MOTIVOS_TROCA`) → `enviarEvento({ nome: "wizard_troca", dados: { motivo } })` e `router.push(urlDaNoite(proximaRodada(estado, motivo, mostrados)))`, com `mostrados` = destaque primeiro + opções (`{ id, duracaoMin }`). `null` (limite) troca o botão por "Refazer as perguntas". "Já vi" oferece marcar "Já assisti" (`alternarLista` de `src/features/listas/actions.ts`). Mostrar "trocas restantes: {MAX_TROCAS - trocas}".
5. "Vou ver esse!" (no destaque e em cada opção) → `enviarEvento({ nome: "wizard_escolheu", dados: { trocas } })` e mensagem de fim com link para `/filme/{id}`. A gravação da escolha vem no passo 6.
6. `wizard_iniciado` ao abrir `/noite` sem respostas; `wizard_abandonado` no `pagehide` sem escolha (`etapa`: `perguntas` ou `resultado`).
7. Testes: unitários dos componentes (Testing Library) e `tests/e2e/noite.spec.ts` (critério 7 da spec): 4 cliques, "Voltar", troca com 3 opções sem repetir, limite de trocas, família só com "Para a família", `/perfil` igual depois.

Rascunho original do mapeamento (substituído pela spec):

| Experiência | Gêneros (IDs de filme do TMDB) |
|---|---|
| rir | Comédia 35 (+ Animação 16 em "família") |
| me emocionar | Drama 18, Romance 10749 |
| levar susto | Terror 27 |
| ficar tenso | Thriller 53, Crime 80, Mistério 9648 |
| pensar | Ficção científica 878, Mistério 9648, Drama 18 |
| só me distrair | Ação 28, Aventura 12, Comédia 35, Animação 16 |

| Humor | Ajuste |
|---|---|
| cansado | duração ≤ 110 min; ordenar por popularidade |
| animado | nenhum |
| pra baixo | exclui Terror 27, Guerra 10752 e Thriller 53, salvo se a experiência pedir |
| nostálgico | lançado até 2005 (`primary_release_date.lte`) |
| ansioso | exclui Terror 27, Thriller 53 e Guerra 10752, salvo se a experiência pedir |
| de boa | nenhum |

| Companhia | Ajuste |
|---|---|
| sozinho / a dois | nenhum |
| família com crianças | classificação BR ≤ 12 (aguardando a resposta da #2), exclui Terror 27; sem classificação BR não entra |
| amigos | prioriza popularidade |

Regras fixas: piso de **nota ≥ 6,5 e votos ≥ 300**. `semGeneros` = gêneros evitados do perfil + exclusões do humor. Excluir os itens de "Já assisti", as reações `nao-gostei` e o que já foi mostrado na sessão. Primeiro buscar nos streamings da pessoa; se vier vazio, buscar sem filtro de provedor.

Implementação:

- Estender `FiltrosDescoberta` e `descobrirFilmes` com `classificacaoMax` (`certification_country=BR` + `certification.lte`) e `lancadoDesde`/`lancadoAte` (`primary_release_date.gte/lte`). Testar em `tests/unit/lib/tmdb/` e atualizar o TMDB falso dos E2E.
- Lógica pura em `src/features/noite/`: `filtrosDaNoite(respostas, perfil)`, `motivoDaNoite(respostas, filme, provedor)`, `proximaRodada(motivoTroca, filtros)` e o limite de 5 trocas, tudo com testes de tabela.
- Rota `/noite` em `src/app/(app)/noite/`. Estado na **URL** (`?humor=&exp=&com=&vistos=&trocas=`), com "Voltar" pelo histórico. Botão de destaque "O que ver hoje?" no topo do dashboard: 1 clique + 3 respostas = 4 cliques.
- Resultado: o primeiro filme com `obterFilme(id)` (duração, trailer, onde assistir). O componente `Trailer` é reaproveitado. **"Termina às" é calculado no navegador** (fuso da pessoa), nunca no servidor.
- "Esse não" mostra o motivo (Já vi / Não é o clima / Muito longo / Outro) e depois 1 destaque + 2 opções menores. "Já vi" oferece marcar "Já assisti" com a action de `src/features/listas/`.
- Eventos do #5: `enviarEvento` no navegador e `registrarEvento`/`registrarClima` no servidor, com os slugs de clima e os motivos de troca da spec de métricas. `Trailer` com `origem="noite"`. E2E: dashboard → resultado em 4 cliques, troca, limite de trocas e "família" sem filme acima da classificação.

### Passo 6: "Como foi?", #7

Spec `SPEC/AAAA-MM-DD-como-foi.md`. Migration `escolhas_noite (usuario_id, tipo tipo_midia default 'filme', tmdb_id, titulo, escolhido_em, respondido_em, vezes_perguntado)`, com RLS por `usuario_id`. "Vou ver esse!" grava a escolha. O dashboard pergunta só pela mais recente não respondida com `vezes_perguntado < 2`. A resposta usa `definirReacao` + marca "Já assisti". "Não cheguei a ver" só marca como respondida. Eventos `como_foi_exibido` e `como_foi_respondido`.

### Passo 7: séries, #8

Spec `SPEC/AAAA-MM-DD-series.md`. Migration nova: enum `tipo_midia`, coluna `tipo` com valor padrão `filme` em `reacoes` e `lista_itens`, e troca da PK para `(usuario_id, tipo, tmdb_id)` **sem recriar as tabelas**. Revisar cada leitura (motor, dashboard, surpresa, listas, MCP) com `tipo = 'filme'`, com testes de integração. TMDB: `obterSerie`, `descobrirSeries` e gêneros de TV (`/genre/tv/list`). Página `/serie/[id]`. Reações, listas e "Como foi?" com séries. "Série" no wizard.

### Passo 8: README e entrega

- README da AP2: URL nova, dupla, o que mudou, ferramentas e modelos, saída do `cloc --diff` (linhas de teste separadas).
- Checklist final: CI verde na `main`, URL servindo o último SHA, sessões e custos registrados, nenhum segredo, todas as specs commitadas antes do código.

## Pontos de atenção

- **Migrations e RLS** só são validadas no CI (Supabase local em Docker). Fazer push cedo e acompanhar com `gh run watch`.
- **CI com `supabase/setup-cli` em `version: latest`:** se quebrar por versão nova da CLI, fixar a versão.
- **Escopo adicional**, se houver espaço: a #9 ("Noite a dois") ou o que ficou de fora em 3.5, sempre com spec própria.
