<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Diretrizes da AP2: Filme Certo

> Disciplina **Desenvolvimento de Software Apoiado por IA** (UFPA, 2026). Este repositório é o fork em que a dupla da AP2 evolui o Filme Certo, construído por outra dupla na AP1.
>
> **Todo agente lê este arquivo e depois o [TASKS.md](TASKS.md)** antes de fazer qualquer coisa. O TASKS.md diz o que já foi feito e qual é o próximo passo.
>
> Tudo é auditado **por script, a partir do repositório**. O que não estiver no repositório do jeito descrito aqui conta como não feito ou zera o critério.
>
> **A seção 0 é obrigatória em toda sessão, sem exceção.** As outras seções detalham o porquê.

## 0. Checklist obrigatório

### Ao começar a sessão

```bash
git switch main && git pull --ff-only     # sempre partir da main atualizada
git config core.hooksPath .githooks       # hooks da AP2 (o pnpm install já faz)
git switch -c <tipo>/<slug>               # feat/, fix/, docs/ ou chore/
```

- Leia o [TASKS.md](TASKS.md) e pegue o próximo passo.
- Nunca trabalhe na `main` nem numa branch cujo PR já foi mesclado.

### Antes de cada commit

1. **Funcionalidade nova?** A spec dela (`SPEC/AAAA-MM-DD-<parte>.md`) já precisa estar commitada **sozinha, num commit anterior**. Se não estiver, commite a spec primeiro.
2. **Um passo lógico por commit**, com menos de 400 linhas alteradas e com o teste junto.
3. A mensagem **termina com `Agent:` e `Spec:`** (seção 5). O hook `.githooks/commit-msg` recusa o commit sem os dois, ou se a spec citada não existir. **Nunca use `--no-verify`.**

### Antes de abrir o PR

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm check:secrets
git push -u origin HEAD
gh pr create --base main --title "<tipo>(<escopo>): <resumo>" --body "Closes #<N>
Spec: SPEC/<spec>.md
<o que mudou e como testar>"
gh run watch                               # o CI tem que ficar verde
```

- **Sempre `--base main`.** O PR #1 foi aberto contra outra branch e teve que ser refeito.
- Peça a aprovação do **outro** integrante.

### Para mesclar: nunca pelo botão do GitHub

O merge do GitHub cria um commit **sem trailers**, que conta contra o mínimo de 80%. Isso já aconteceu nos PRs #1, #10 e #11. Mescle só depois da aprovação e do CI verde, sempre pelo terminal:

```bash
gh pr merge <N> --merge \
  --subject "Merge pull request #<N>: <título do PR>" \
  --body "<resumo em uma linha>

Agent: claude-code/claude-opus-5-5
Spec: SPEC/<spec do PR>.md"
git switch main && git pull --ff-only
curl -s https://dsai-ap2-filme-certo.vercel.app/api/health   # depois do deploy, "commit" = SHA da main
```

Se quem mescla é a própria pessoa, sem agente, use `Agent: none`.

### Ao encerrar a sessão

1. Atualize o [TASKS.md](TASKS.md): o que foi feito e qual é o próximo passo (commit `docs(tasks): ...`).
2. Registre a sessão (seção 8): copie a exportação para `prompts/sessoes/`, procure segredos e adicione a linha em `prompts/custos.md` (commit `chore(sessoes): ...`).
3. Os dois commits entram na branch do PR em aberto. Se não houver PR aberto, use a branch `chore/sessoes-AAAA-MM-DD` com o próprio PR.

### Autoverificação (rode antes de encerrar)

```bash
# commits com os dois trailers desde a AP1 (mínimo 80%)
t=0; ok=0; for c in $(git rev-list 4ac8b98..origin/main); do t=$((t+1)); b=$(git log -1 --format=%B $c); echo "$b" | grep -q '^Agent:' && echo "$b" | grep -q '^Spec:' && ok=$((ok+1)); done; echo "trailers: $ok/$t"
# parcela de commits de cada integrante (mínimo 30% cada)
git shortlog -sn 4ac8b98..origin/main
```

## 1. Quem é quem

| Papel | Pessoas |
|---|---|
| Dupla da AP2 (escreve o código) | Leonardo Ribeiro ([@LeoGRibeiro](https://github.com/LeoGRibeiro)) e Lucas Reis ([@Lucas-xps](https://github.com/Lucas-xps)) |
| Clientes (autores da AP1, **não** escrevem código) | Alexsandro Costa ([@sandroccosta](https://github.com/sandroccosta)) e Jonathan Fagundes ([@jonathanfufu](https://github.com/jonathanfufu)) |
| Professor | Gustavo Pinto |

- **Prazo final:** 19/11/2026.
- **Requisitos:** [docs/ap2/pedido-do-cliente.md](docs/ap2/pedido-do-cliente.md), em ordem de prioridade.
- **Escopo e decisões gerais:** [SPEC/2026-11-17-visao-geral-ap2.md](SPEC/2026-11-17-visao-geral-ap2.md).
- **Backlog:** issues do GitHub, de #2 a #9.

Trabalhamos como **FDE**: somos donos do negócio e da técnica. Quando houver dúvida de produto, a resposta vem do pedido do cliente. Se o pedido não responder, registre a dúvida numa issue com o rótulo `pergunta-cliente`, siga com a opção mais conservadora e documente a decisão na spec.

## 2. Restrições eliminatórias

Qualquer uma destas anula a AP2 ou zera o critério:

1. **Sem reescrita.** Não trocar linguagem (TypeScript), framework (Next.js 16 App Router), banco (Supabase) nem catálogo (TMDB). Não abrir outro repositório. Não apagar módulos para refazer.
2. **Refatoração só localizada,** justificada numa issue e coberta por teste.
3. **Histórico sem reescrita.** Nada de `push --force`, `rebase` do que já foi enviado, `squash` ou `commit --amend` em commit já publicado. O merge de PR é sempre por *merge commit*; squash e rebase estão desativados no repositório.
4. **Nada de commit direto na `main`.** A `main` é protegida: só aceita PR com 1 aprovação e com o check `verificar` do CI verde.
5. **Autoria real.** Cada pessoa commita com a própria conta, nas próprias sessões. **Nunca** use `--author` ou `Co-authored-by` para atribuir trabalho a quem não o fez. Commits dos clientes no fork não contam.
6. **Sem URL pública no ar e CI verde, a AP2 não é avaliada.**
7. **Linhas inventadas não contam:** código duplicado, gerado em massa, morto ou arquivos gerados (lockfiles, `build/`, `vendor/`, minificados).

## 3. Fluxo obrigatório de cada funcionalidade

```
issue → branch → commit da SPEC → commits de código + testes → PR → aprovação do outro integrante → merge
```

1. **Issue.** Toda funcionalidade, refatoração ou correção tem issue. O backlog já está em #3 a #9.
2. **Branch** a partir da `main` atualizada: `feat/<slug>`, `fix/<slug>`, `docs/<slug>` ou `chore/<slug>`.
3. **Spec primeiro.** Arquivo `SPEC/AAAA-MM-DD-<slug>.md`, com a data do dia em que foi escrita, num **commit só da spec**, anterior a qualquer commit de código que a cite. Veja a seção 4.
4. **Código com testes**, em commits pequenos (seção 5).
5. **PR** com `--base main`, com descrição que liga a issue (`Closes #N`) e a spec.
6. **Aprovação:** o *outro* integrante revisa e aprova no GitHub, porque o autor não pode aprovar o próprio PR.
7. **Merge pelo terminal**, com trailers na mensagem do merge (seção 0). Nunca pelo botão do GitHub.
8. Atualizar o [TASKS.md](TASKS.md) e registrar a sessão no fim.

## 4. Specs (`SPEC/`)

- Nome: `AAAA-MM-DD-<parte>.md`. Uma spec por funcionalidade nova.
- Cabeçalho no formato da AP1: **Data**, **Componente**, **Status**, **Substitui**.
- Seções: **O quê**, **Por quê** (citando a seção do [pedido do cliente](docs/ap2/pedido-do-cliente.md)), **Decisões técnicas** (em tabela, como nas specs da AP1), **Banco de dados** (se houver), **Critérios de aceitação** (numerados, verificáveis e ligados a testes) e **Fora do escopo**.
- O wizard tem uma exigência do cliente: a **tabela de mapeamento** das respostas para os filtros (gêneros, tom, classificação) tem que estar na spec.
- Ajuste pequeno: edite a spec e commite. Mudança de rumo: crie um arquivo novo e datado dizendo qual spec ele substitui.
- Exemplos bons para copiar: [2026-10-05-listas.md](SPEC/2026-10-05-listas.md) e [2026-10-05-reacoes.md](SPEC/2026-10-05-reacoes.md).

## 5. Commits

Formato *Conventional Commits* em português, como na AP1, com **dois trailers obrigatórios** no fim da mensagem:

```
feat(noite): troca a sugestão quando o motivo é "muito longo"

Reduz a duração máxima da próxima rodada para 100 minutos.

Agent: claude-code/claude-opus-5-5
Spec: SPEC/2026-11-17-wizard-noite.md
```

- `Agent:` traz `<ferramenta>/<modelo>` de quem gerou o código. Escrito à mão: `Agent: none`. Gerado e editado à mão: `Agent: claude-code/claude-opus-5-5 + manual`.
- `Spec:` aponta a spec que o commit implementa. Commits de processo, infraestrutura e sessões citam `SPEC/2026-11-17-visao-geral-ap2.md`.
- **Pelo menos 80% dos commits** devem ter os dois trailers. A meta é 100%. **Merges também são commits e entram na conta.** Os merges de PR levam trailers na mensagem (seção 0), e o hook `commit-msg` cobre os commits e merges locais.
- **Commits pequenos:** a mediana tem que ficar **abaixo de 400 linhas** alteradas. Um commit por passo lógico: migration, lógica pura com testes, action, tela.
- **Frequência:** commits em pelo menos 2 dias distintos por semana.
- **Autoria:** cada integrante com **pelo menos 30% dos commits**. Dividam as issues entre os dois (veja o TASKS.md).
- Exportações de sessão vão em **commit separado** (`chore(sessoes): ...`), para não distorcer o tamanho dos commits de código.
- Mensagens com várias linhas: use arquivo temporário ou heredoc. No PowerShell, here-string `@'...'@` com o `'@` final na coluna 0.

## 6. Testes e qualidade

| Critério | Mínimo | Como cumprir |
|---|---|---|
| Cobertura do código novo (*diff coverage*) | 70% | Teste junto com o código, no mesmo PR |
| Testes que testam | Revertida a mudança, o teste falha | Testar comportamento observável, nunca só "renderiza sem erro" |
| Duplicação (`jscpd`) | até 5% | Reaproveitar o que existe: `Trailer`, `definirReacao`, `descobrirFilmes` |
| CI | Verde no último commit da `main`; 80% dos builds verdes | Rodar os portões locais antes de cada push |

- **Unitários** (`tests/unit/`, Vitest + Testing Library): lógica pura, componentes e actions com dependências injetadas, no mesmo padrão de `criarApiFilmes(cliente)` e `definirReacao(..., buscarFilme)`.
- **Integração** (`tests/integration/`): migrations e RLS contra o Supabase local. Toda tabela nova precisa de teste de RLS.
- **E2E** (`tests/e2e/`, Playwright com TMDB falso em `tests/e2e/tmdb-falso/`): o fluxo principal de cada funcionalidade. Rotas novas do TMDB precisam de resposta no servidor falso.
- **Portões antes de cada push** (todos com saída 0):

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm check:secrets
```

- **Sem Docker na máquina do Leonardo:** integração e E2E só rodam no CI. Depois de cada push, acompanhe com `gh run watch` e corrija na hora se ficar vermelho.

## 7. Banco de dados (Supabase)

- Só **migrations novas** em `supabase/migrations/<timestamp>_<nome>.sql`. Nunca edite uma migration já existente.
- **Nunca** use `drop table` nem recrie tabelas, porque a produção tem dados reais. Para mudar chave, use `alter table ... drop constraint` / `add primary key` dentro da mesma migration, preservando as linhas.
- **RLS em toda tabela nova**, com políticas mínimas. Os eventos são **só insert** para `authenticated`.
- Atualize `src/lib/supabase/database.types.ts`. Com Docker, use `pnpm db:types`. Sem Docker, edite à mão seguindo o formato gerado. O CI valida migrations e tipos nos testes de integração e no typecheck.
- Comente tabelas e colunas na migration, como na AP1.

## 8. Registro das sessões e custo

- Ao fim de **cada** sessão com agente, a exportação bruta vai para `prompts/sessoes/AAAA-MM-DD-HHMM-<ferramenta>.<ext>` (data e hora de início da sessão).
  - Claude Code: o `.jsonl` da sessão em `~/.claude/projects/<pasta-do-projeto>/`. Para este projeto na máquina do Leonardo: `~/.claude/projects/c--Users-Leonardo-programacoes-Faculdade-dsai-ap2-FilmeCerto/`.
  - Outras ferramentas: a exportação da conversa. Se não houver, a conversa inteira num `.md`.
  - Acima de 50 MB, compacte com `gzip`.
- **Todo dia com commit de agente precisa de uma sessão registrada.**
- **Custo:** cada sessão tem uma linha em `prompts/custos.md` (arquivo, ferramenta, modelo, tokens de entrada, saída e cache, custo).
  - Claude Code: a extensão do VS Code não tem `/cost`. Some `message.usage` das mensagens do assistente no `.jsonl` (`input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`), contando cada `message.id` uma vez só. O critério aceita tokens **ou** custo.
  - Antigravity: a exportação traz uma linha `"type":"cost-state"` com os tokens e o `costUSD`. Use esses valores.
- **Segredos:** antes de commitar uma exportação, procure chaves (`sb_secret_`, `eyJhbGciOi`, `TMDB_READ_TOKEN=`, `ghp_`, `sk-`). **Nunca peça ao agente para ler o `.env.local`.** Uma chave exposta tem que ser revogada, não só apagada.
- Prompts entram como foram escritos, inclusive os que falharam e os de uma palavra. Nunca reescreva prompts depois.

## 9. Segurança

- Nenhum segredo no repositório. O `gitleaks` roda sobre o histórico, e o `pnpm check:secrets` verifica o bundle.
- `.env.local` fica no `.gitignore`. Variáveis novas são documentadas no `.env.example`, com valores falsos.
- Tokens do TMDB e chaves do Supabase só no servidor (`server-only`), exceto as `NEXT_PUBLIC_*`.
- Não pode haver alertas críticos de dependência (`pnpm audit --audit-level critical`).

## 10. As métricas da avaliação

**Volume e processo (27 pts)**

| Critério | Mínimo | Pts |
|---|---|---|
| Linhas novas (`cloc --diff` contra `4ac8b98`) | 100 mil | 8 |
| Duplicação (`jscpd`) | até 5% | 3 |
| Spec antes do código, para cada funcionalidade nova | 100% | 5 |
| Commits com `Agent:` e `Spec:` | 80% | 3 |
| Dias com commit / mediana do tamanho do commit | 2 dias por semana / < 400 linhas | 3 |
| Sessão registrada para cada dia com commit de agente | 100% | 3 |
| Parcela de commits de cada integrante | 30% cada | 2 |

**Qualidade e entrega (23 pts)**

| Critério | Mínimo | Pts |
|---|---|---|
| Cobertura de linhas do código novo | 70% | 5 |
| Testes novos que falham quando a mudança é revertida | amostra de 5, todos falham | 4 |
| CI verde no último commit da `main` / builds verdes | verde / 80% | 3 |
| Merges na `main` por PR aprovado pela dupla | 100% | 3 |
| Segredos no histórico e alertas críticos | zero | 3 |
| URL pública servindo o último commit da `main` | no ar no dia | 3 |
| Tokens ou custo registrados em cada sessão | 100% | 2 |

Critério abaixo do mínimo vale zero.

Contagem de linhas novas (o executável do `cloc` está em `../reservei/cloc-1.98.exe`):

```bash
cloc --git --diff 4ac8b98 HEAD \
  --exclude-dir=node_modules,vendor,dist,build,prompts \
  --exclude-lang=Markdown,JSON,YAML,CSV,Text,SVG \
  --not-match-f='(lock|\.min\.)'
```

## 11. Ambiente local (Windows)

- Node 22.12+ (a máquina tem o 24) e pnpm 10.
- Neste terminal sem TTY, o `pnpm install` precisa de `CI=true` (`CI=true pnpm install --frozen-lockfile`).
- Comandos: `pnpm dev` (http://localhost:3000), `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm check:secrets`. Integração e E2E precisam de Docker (`pnpm db:start`).
- `gh` (GitHub CLI) e `vercel` (CLI, logado como `leogribeiro`) estão instalados.
- **Hooks de git** em `.githooks/`: `pre-commit` bloqueia commit na `main` e `commit-msg` exige os trailers. São ativados por `git config core.hooksPath .githooks`, que o script `prepare` roda no `pnpm install`. Num clone novo, confira com `git config core.hooksPath`.
- No Git Bash, `git show <ref>:<arquivo>` precisa de `MSYS_NO_PATHCONV=1`, senão o caminho é convertido e o comando falha.

## 12. Postura esperada do agente

- **Leia antes de mudar:** a spec da AP1 da área, o código e os testes existentes. Reaproveite.
- **Siga o filtro do cliente:** ajuda a decidir mais rápido? Nada de catálogo, carrossel novo ou gamificação.
- **Não infle linhas.** Escreva o código que a funcionalidade precisa, com testes de verdade.
- **Não peça confirmação para o que estas regras já decidem.** Pergunte só decisões de produto que o pedido do cliente não resolve.
- **Ao fim de cada sessão:** portões verdes, commits feitos, push, PR aberto ou atualizado e [TASKS.md](TASKS.md) atualizado com o próximo passo.
