# Spec: Séries, a base (tipo nas reações e listas, cliente do TMDB)

- **Data:** 2026-11-18
- **Componente:** series-base (coluna `tipo` em `reacoes` e `lista_itens`; cliente do TMDB para séries)
- **Status:** aprovada para implementação
- **Substitui:** nenhuma. Detalha a linha 4 da tabela de `SPEC/2026-11-17-visao-geral-ap2.md` e é a primeira de três specs de séries (`series-base`, `series-pagina`, `series-noite`). Ajusta a chave de `SPEC/2026-10-05-reacoes.md` e `SPEC/2026-10-05-listas.md` e o "Fora do escopo" de `SPEC/2026-10-05-cliente-tmdb.md` (que dizia que séries não fazem parte do produto)
- **Depende de:** [2026-11-18-como-foi.md](2026-11-18-como-foi.md) (enum `public.tipo_midia`)

## O quê

A base que a página da série e o wizard com séries vão usar. **Nada muda na tela** nesta spec.

1. `reacoes` e `lista_itens` ganham a coluna `tipo` (`filme` ou `serie`, padrão `filme`), e a chave passa a ser `(usuario_id, tipo, tmdb_id)`. Todas as linhas atuais continuam válidas, como filmes.
2. Tudo o que lê essas tabelas e só espera filmes passa a filtrar `tipo = 'filme'`: motor (dashboard), "Me surpreenda", listas, wizard, página do filme e MCP.
3. O cliente do TMDB ganha séries: `descobrirSeries`, `obterSerie` e `generosSeries` (`/genre/tv/list`), com esquemas zod. O TMDB falso dos testes E2E passa a responder `/discover/tv`, `/tv/{id}` e `/genre/tv/list`.

## Por quê

[Pedido do cliente, seção 3.5](../docs/ap2/pedido-do-cliente.md#35-suporte-completo-a-séries): "à noite, muita gente quer 'um episódio de alguma coisa', não um filme de 2 horas". O próprio pedido aponta o risco técnico, que esta spec resolve antes de qualquer tela:

> "no TMDB, filme e série têm sequências de ID independentes, então o mesmo número pode ser um filme e uma série diferentes. Hoje `reacoes` e `lista_itens` usam a chave `(usuario_id, tmdb_id)`."

| Exigência do pedido (3.5) | Como |
|---|---|
| "adicionar uma coluna `tipo` (`filme` \| `serie`) com padrão `filme`" | `add column tipo public.tipo_midia not null default 'filme'` nas duas tabelas |
| "trocar a chave para `(usuario_id, tipo, tmdb_id)`" | `drop constraint` da chave antiga e `add primary key` no mesmo `alter table` |
| "numa migration nova, sem apagar nem recriar as tabelas" | migration `20261118224000_tipo_midia_reacoes_listas.sql`, só com `alter table` |
| "revisar tudo o que lê essas tabelas [...] Onde só se espera filme, filtrar `tipo = 'filme'`" | tabela "Leituras e gravações" abaixo |
| "Os gêneros de série no TMDB também são outra lista (`/genre/tv/list`)" | `generosSeries()` e os IDs de TV na seção "Cliente do TMDB" |

Separar a base das telas deixa as duas specs seguintes (`series-pagina` e `series-noite`) pequenas e com um único risco cada.

## Decisões técnicas

| Tema | Decisão |
|---|---|
| Tipo de mídia | O enum `public.tipo_midia` (`filme`, `serie`) que já existe, criado pela spec do "Como foi?". Nenhum enum novo |
| Dados atuais | A coluna nasce com `default 'filme'`: todas as reações e itens de lista que já existem viram filmes, sem `update` e sem reescrever a tabela |
| Chave | `(usuario_id, tipo, tmdb_id)`, nessa ordem: as consultas filtram por usuário (RLS), tipo e ID. A chave antiga (`reacoes_pkey` e `lista_itens_pkey`, nomes padrão do Postgres nas migrations da AP1) sai com `drop constraint` no mesmo `alter table` que cria a nova |
| RLS, gatilhos e funções | Não mudam. As políticas usam só `usuario_id`; o gatilho `tocar_atualizado_em` não depende da chave; nenhuma função SQL (métricas inclusive) e nenhuma chave estrangeira usa essas tabelas |
| Leituras | Toda leitura que só espera filme filtra `.eq("tipo", "filme")`. Sem o filtro, uma série de mesmo ID entraria no motor como filme, apareceria em `/listas` com link para `/filme/{id}` errado, e `maybeSingle()` falharia com duas linhas |
| Gravações de reação e lista | `definirReacao` e `definirLista` gravam `tipo: "filme"` **explicitamente**, e só leem e apagam a linha do filme. A leitura e a gravação dizem o mesmo tipo, e a spec `series-pagina` só troca esse valor por um parâmetro. Sem o filtro no `delete`, tirar a reação de um filme apagaria também a da série de mesmo ID |
| Onboarding | `gravarOnboarding` não muda: ele só grava filmes (os amados e os rejeitados do onboarding) e continua pelo padrão `filme` da coluna. O teste de integração da migration confere esse padrão |
| MCP | Nenhuma mudança em `src/features/mcp/`: ele lê e grava pelas funções da tabela abaixo, que já filtram. O MCP continua só de filmes, como pede o pedido |
| Escopo de séries | Esta spec não grava nenhuma série pelo app. Até a spec `series-pagina`, linhas `serie` só existem nos testes |

### Leituras e gravações revisadas

| Arquivo | Função | Quem usa | Mudança |
|---|---|---|---|
| `src/features/reacoes/consultas.ts` | `obterReacoes` | dashboard (motor), "Me surpreenda", MCP (`recomendar-filmes`) | só `filme` |
| `src/features/reacoes/consultas.ts` | `obterReacao(tmdbId)` | página do filme, action `reagir`, MCP (`detalhes-filme`) | só `filme` |
| `src/features/reacoes/gravar.ts` | `definirReacao` | action `reagir`, "Como foi?", MCP (`avaliar-filme`) | lê e apaga só `filme`; grava `tipo: "filme"` |
| `src/features/listas/consultas.ts` | `obterItensLista` | `/listas`, MCP (`ver-listas`) | itens e reações só `filme` |
| `src/features/listas/consultas.ts` | `idsNasListas` | dashboard (motor), "Me surpreenda", MCP (`recomendar-filmes`) | só `filme` |
| `src/features/listas/consultas.ts` | `obterStatusLista(tmdbId)` | página do filme, action `alternarLista`, MCP (`detalhes-filme`) | só `filme` |
| `src/features/listas/gravar.ts` | `definirLista` | action `alternarLista`, "Como foi?", MCP (`marcar-na-lista`) | lê e apaga só `filme`; grava `tipo: "filme"` |
| `src/features/noite/consultas.ts` | `idsParaExcluir` | wizard da noite | "Já assisti" e reações só `filme` |
| `src/features/preferencias/gravar.ts` | `gravarOnboarding` | onboarding | nenhuma (padrão `filme`) |

`escolhas_noite` já tem `tipo` desde a spec do "Como foi?" e não muda.

## Cliente do TMDB

| Tema | Decisão |
|---|---|
| Onde fica | `src/lib/tmdb/series.ts` (`server-only`), com `criarApiSeries(cliente)` sobre o mesmo `ClienteTmdb` dos filmes: Bearer, timeout, novas tentativas, cache do `fetch` e `TmdbErro` da spec `cliente-tmdb`. Nenhum cliente HTTP novo |
| Código comum | `src/lib/tmdb/comum.ts` reúne o que filmes e séries convertem igual: validação zod, página, ano, trailer, elenco, onde assistir no BR e os parâmetros comuns do `discover`. `filmes.ts` passa a importar de lá, sem mudar o comportamento (os testes do cliente de filmes continuam iguais) |
| Esquemas | Em `esquemas.ts`, vídeos, créditos, onde assistir e gênero viram esquemas compartilhados por filme e série. Novos: `serieTmdb`, `detalhesSerieTmdb` e `generosTmdb` |
| `SerieResumo` | O mesmo formato de `FilmeResumo` (`titulo` vem de `name`, `ano` da estreia, `first_air_date`), para as telas reaproveitarem o `CartaoFilme`. Os `generos` são IDs de gênero **de TV** |
| Duração do episódio | `duracaoEpisodioMin`: média de `episode_run_time`, arredondada. O TMDB deixou de preencher esse campo em muitas séries, então, se ele vier vazio, vale a duração do último episódio exibido (`last_episode_to_air.runtime`); sem as duas, `null` |
| Temporadas | `seasons` sem a temporada 0 ("Especiais"), em ordem: número, nome, episódios, ano e pôster |
| Classificação indicativa | `obterSerie` pede `content_ratings` e devolve a classificação do Brasil (`L`, `10`, `12`, `14`, `16`, `18`), ou `null` se faltar ou vier outro valor. O `/discover/tv` não filtra por classificação, então quem precisar dela (o wizard em "família", spec `series-noite`) confere série a série |
| Gêneros de TV | `generosSeries()` lê `/genre/tv/list`. É outra lista, com IDs próprios (ex.: 10759 "Action & Adventure", 10765 "Sci-Fi & Fantasy", 10762 "Kids", 10768 "War & Politics"); só alguns coincidem com os de filme (16, 18, 35, 37, 80, 99, 9648, 10751) |
| Idioma | `language=pt-BR` em toda chamada, como nos filmes. O `/discover/tv` não tem `region`, então ele não é enviado |
| 404 | `obterSerie` devolve `null`, como `obterFilme` |

### Funções

| Função | Endpoint | `revalidate` |
|---|---|---|
| `descobrirSeries(filtros)` | `GET /discover/tv` | 6 h |
| `obterSerie(id)` | `GET /tv/{id}?append_to_response=videos,credits,watch/providers,content_ratings` | 24 h |
| `generosSeries()` | `GET /genre/tv/list` | 24 h |

`FiltrosDescobertaSerie` são os `FiltrosDescoberta` dos filmes sem `classificacaoMax`, para o wizard montar os filtros de série do mesmo jeito:

| Filtro | Parâmetro do TMDB |
|---|---|
| `generos` / `todosGeneros` | `with_genres`, com `\|` (qualquer um) ou `,` (todos) |
| `semGeneros` | `without_genres` |
| `provedores` | `with_watch_providers`, `watch_region=BR`, `with_watch_monetization_types=flatrate` |
| `duracaoMin`, `duracaoMax` (do **episódio**) | `with_runtime.gte`, `with_runtime.lte` |
| `notaMin`, `votosMin` | `vote_average.gte`, `vote_count.gte` |
| `ano` | `first_air_date_year` |
| `lancadoAte` | `first_air_date.lte` |
| `ordem` | `popularity.desc`, `vote_average.desc` ou `first_air_date.desc` (padrão `popularidade`) |
| `pagina` | `page`, limitada de 1 a 500 |

Sempre: `include_adult=false`.

### TMDB falso (`tests/e2e/tmdb-falso/servidor.mjs`)

| Rota | Resposta |
|---|---|
| `/3/discover/tv` | 20 séries por página, "Série {gênero} {página}-{n}". Os IDs seguem a fórmula dos filmes, então a mesma consulta devolve IDs que também são filmes: a colisão do pedido fica testável |
| `/3/tv/{id}` | "Série {id}": 2 temporadas (mais os especiais), episódio de 45 min, trailer, elenco, criadora, Netflix e classificação 12. A partir de 999000000, 404 |
| `/3/genre/tv/list` | os gêneros de TV |

## Banco de dados

Migration `supabase/migrations/20261118224000_tipo_midia_reacoes_listas.sql`, só com `alter table`:

- `public.reacoes`: `add column tipo public.tipo_midia not null default 'filme'`; `drop constraint reacoes_pkey`, `add primary key (usuario_id, tipo, tmdb_id)`.
- `public.lista_itens`: `add column tipo public.tipo_midia not null default 'filme'`; `drop constraint lista_itens_pkey`, `add primary key (usuario_id, tipo, tmdb_id)`.
- Comentários nas colunas novas e nas tabelas (que deixam de dizer "filme" e passam a dizer "título").
- Sem `drop table`, sem recriar tabela, sem `update` nos dados.

`src/lib/supabase/database.types.ts` ganha `tipo` nas duas tabelas, editado à mão no formato gerado.

**Depois do merge:** `pnpm exec supabase db push` (com `--dry-run` antes) aplica a migration na produção.

## Critérios de aceitação

1. `pnpm db:reset` aplica as migrations do zero sem erros (CI).
2. **Migration** (`tests/integration/series/tipo-midia.test.ts`, Supabase local):
   1. reação e item de lista gravados sem `tipo`, como na AP1, ficam como `filme`;
   2. o mesmo `tmdb_id` como filme e como série convive nas duas tabelas, e o `upsert` de um não muda o outro;
   3. o banco recusa repetir `(usuario_id, tipo, tmdb_id)` (`23505`) e `tipo` fora do enum (`22P02`);
   4. o usuário B lê zero séries de A, e ninguém grava série em nome de outra pessoa (`42501`).
3. **Leituras e gravações** (unitários com um banco em memória que tem um filme e uma série de mesmo ID: `tests/unit/features/reacoes/consultas.test.ts`, `tests/unit/features/listas/consultas.test.ts` e `tests/unit/features/noite/servidor.test.ts`):
   1. `obterReacoes`, `idsNasListas` e `idsParaExcluir` ignoram as séries;
   2. `obterReacao` e `obterStatusLista` devolvem o valor do filme;
   3. `obterItensLista` não lista a série nem mostra a reação dada à série;
   4. `definirReacao` e `definirLista` gravam `tipo: "filme"`, e com `null` apagam só o filme.
4. **As mesmas leituras no Supabase local** (`tests/integration/series/leitores.test.ts`): com filme e série de mesmo ID, as funções da tabela "Leituras e gravações" veem só o filme, e tirar a reação e o item do filme deixa os da série.
5. **Cliente de séries** (`tests/unit/lib/tmdb/series.test.ts`, `fetch` falso):
   1. `descobrirSeries` chama `/discover/tv` com todos os parâmetros da tabela de filtros, sem `region`, com 6 h de cache, e converte a página (`titulo` de `name`, `ano` de `first_air_date`, `null` para data vazia);
   2. `obterSerie` chama `/tv/{id}` com os dados anexos e 24 h de cache, e converte gêneros, duração do episódio (média, e o último episódio quando a lista vem vazia), temporadas sem os especiais, trailer, elenco até 10, criação, onde assistir no BR e classificação BR;
   3. `obterSerie` devolve `null` no 404, e resposta fora do formato vira `TmdbErro`;
   4. `generosSeries` chama `/genre/tv/list` e devolve `{ id, nome }`.
6. **Contrato do TMDB falso** (`tests/unit/lib/tmdb/tmdb-falso.test.ts`): o servidor falso sobe numa porta livre, e as três funções de séries leem as respostas dele sem erro de formato; `/tv/{id}` e `/movie/{id}` com o mesmo ID devolvem títulos diferentes.
7. Os testes que já existem continuam passando: os do cliente de filmes depois da extração de `comum.ts`, as integrações de reações, listas, onboarding e MCP, e todo o E2E.
8. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` e `pnpm check:secrets` sem erros, e o CI verde.

## Fora do escopo

| Item | Onde fica |
|---|---|
| Página `/serie/[id]` | spec `series-pagina` |
| Reações e listas aceitarem séries (actions com `tipo`), `/listas` mostrando séries | spec `series-pagina` |
| "Série" no wizard, mapeamento de gêneros de TV e "Como foi?" de série | spec `series-noite` |
| Séries no dashboard, no motor, no "Me surpreenda", na busca e no MCP | fora da AP2, como diz o pedido (3.5) |
| Temporadas e episódios em detalhe (`/tv/{id}/season/{n}`) | não pedido: a página mostra só o resumo das temporadas |
