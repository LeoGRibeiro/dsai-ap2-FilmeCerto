# Spec: Séries, como chegar nelas (dashboard, busca e episódios)

- **Data:** 2026-11-19
- **Componente:** series-descoberta (seção de séries no dashboard, busca de séries, página da temporada, situação da série, trailer de série no funil)
- **Status:** aprovada para implementação
- **Substitui:** nenhuma. Estende a [series-pagina](2026-11-18-series-pagina.md) (temporadas viram links, situação da série, trailer com origem) e tira do "Fora do escopo" dela e da [series-noite](2026-11-18-series-noite.md) os itens "séries no dashboard", "séries na busca" e "episódios de cada temporada". Reaproveita a [dashboard](2026-10-05-dashboard.md) e a [busca](2026-10-05-busca.md) da AP1
- **Depende de:** [series-base](2026-11-18-series-base.md), [series-pagina](2026-11-18-series-pagina.md), [series-noite](2026-11-18-series-noite.md) e [metricas-funil](2026-11-18-metricas-funil.md), todas na `main`
- **Issue:** #33

## O quê

Hoje a página `/serie/{id}` só se abre pelo resultado do wizard com "Série", pelo cartão do "Como foi?" ou digitando o endereço. Esta spec cria caminhos até ela e mostra mais do que a série tem:

1. **Dashboard:** uma seção **"Séries para hoje à noite"** com séries dos gêneros favoritos do perfil. O cartão leva a `/serie/{id}`.
2. **Busca:** a busca por nome ganha as abas **"Filmes | Séries"**. Com "Séries", procura no `/search/tv` e o cartão leva a `/serie/{id}`.
3. **Episódios:** cada temporada da página da série vira um link para **`/serie/{id}/temporada/{n}`**, com a lista de episódios (número, nome, duração, data, sinopse, imagem e nota).
4. **Ajuda a decidir na página da série:**
   1. a **situação** da série ("Em exibição", "Encerrada", "Cancelada") e, se houver, o próximo episódio ("Próximo episódio em 12/12/2026");
   2. o **tempo para ver cada temporada** ("cerca de 7h 30min").
5. **Funil:** o trailer da série registra `trailer_aberto` com origem `serie`, que o `/metricas` mostra como "Página da série".

## Por quê

[Pedido do cliente, seção 3.5](../docs/ap2/pedido-do-cliente.md#35-suporte-completo-a-séries): "séries passam a ser cidadãs do app, como os filmes" e "à noite, muita gente quer 'um episódio de alguma coisa', não um filme de 2 horas".

As PRs #21, #24 e #28 entregaram o que a 3.5 lista, mas na prática a página da série fica escondida: quem não passa pelo wizard com "Série" nunca a vê. Assim, a série não é uma "cidadã do app" como o filme, que aparece no dashboard e na busca.

| Pedido | Como esta spec atende |
|---|---|
| 3.5: "séries passam a ser cidadãs do app, como os filmes" | séries no dashboard e na busca, como os filmes da AP1 |
| 3.5: "página de detalhes da série: sinopse, temporadas, duração média do episódio..." | a temporada abre os episódios, com a duração de cada um |
| 3.5: "um episódio de alguma coisa" | a seção do dashboard prefere séries com episódios curtos; a temporada mostra quanto tempo leva para ver tudo |
| 2 (filtro): "ajuda a decidir mais rápido?" | só uma seção nova no dashboard, sem carrossel novo (é o mesmo `Carrossel` das seções de filmes), e a situação e o tempo total aparecem onde a decisão acontece |
| 3.1 (métricas): funil do trailer | `trailer_aberto` com origem `serie` |

**Mudança de escopo:** a 3.5 dizia "Fora do escopo agora: seções de série no dashboard, [...] na busca". A dupla (como FDE) decidiu incluir as duas, porque sem elas a 3.5 não se cumpre na prática. A pergunta está registrada para o cliente na issue #33 (rótulo `pergunta-cliente`). Se o cliente discordar, a seção do dashboard sai trocando uma linha da página, sem migration.

## Decisões técnicas

| Tema | Decisão |
|---|---|
| Gêneros do perfil em TV | O perfil guarda gêneros de **filme**. A conversão `evitadosEmTv` de `src/features/noite/mapeamento-serie.ts` vira `generosEmTv(generosDeFilme)` em `src/features/serie/generos.ts`, usada pelo wizard (evitados) e pelo dashboard (favoritos e evitados). Refatoração localizada: os testes do wizard de série continuam iguais. Tabela abaixo |
| Seção do dashboard: consulta | `descobrirSeries` com `generos` = favoritos convertidos (qualquer um, `\|`), `semGeneros` = evitados convertidos + exclusão fixa (News, Reality, Talk, Kids), `duracaoMax` 60 (episódio), `votosMin` e `notaMin` do `PERFIS[frequencia]` do motor, ordem por popularidade. Um evitado vence o favorito que vira o mesmo gênero de TV (Ação favorito e Aventura evitado: 10759 só em `semGeneros`). Sem favorito com equivalente em TV, sem filtro de gênero |
| Seção do dashboard: rodada | A página do TMDB vem da rodada (`rodada % paginaMax + 1`), então "Gerar outras recomendações" troca as séries também |
| Seção do dashboard: o que sai | Séries com reação ou numa lista (`tipo = 'serie'`), lidas por `obterReacoes(cliente, "serie")` e `idsNasListas(cliente, "serie")`. As duas ganham o parâmetro `tipo` opcional, com padrão `filme`, então o motor, o "Me surpreenda" e o MCP continuam iguais |
| Seção do dashboard: tamanho | Até 12 séries. Com menos de 4, a seção não aparece (um carrossel com 1 ou 2 cartões não ajuda a decidir) |
| Seção do dashboard: lugar e carregamento | Depois das seções de filmes, num `Suspense` próprio (o motor de filmes não espera o TMDB de séries). Esqueleto igual ao de uma seção. TMDB fora do ar: o mesmo "Não foi possível carregar agora." com "Tentar de novo" das outras seções |
| Seção do dashboard: componente | `SecaoRecomendacoes` com uma `Secao` de id `series` e título "Séries para hoje à noite". O `CartaoFilme` já aceita `tipo: "serie"` (series-pagina). O motivo do cartão é "Porque você curte {gênero}" (`motivoPorGeneros`, com o nome do gênero de TV). Nenhum componente visual novo |
| Busca: tipo na URL | `/busca?q=...&tipo=serie`. Sem `tipo` (ou com valor inválido) é filme: as URLs da AP1 e o campo de busca do cabeçalho continuam iguais. `lerBusca` e `parametrosDaBusca` passam a levar o `tipo`, para a paginação mantê-lo |
| Busca: abas | `AbasTipo` ("Filmes" e "Séries", links que mantêm o `q`) acima dos resultados, só no modo "Por nome". O modo "Por filtros" continua só de filmes e não mostra as abas |
| Busca: TMDB | `buscarSeries(texto, pagina)` em `src/lib/tmdb/series.ts` (`/search/tv`, `include_adult=false`, cache de 6 h como `buscarFilmes`) |
| Busca: textos | Título "Buscar filmes" vira "Buscar". Aba "Séries" sem resultado: "Nenhuma série encontrada para "{texto}"." O placeholder do cabeçalho vira "Buscar filmes e séries" |
| Temporada: TMDB | `obterTemporada(serieId, numero)` em `src/lib/tmdb/series.ts` (`/tv/{id}/season/{n}`, cache de 24 h, 404 → `null`). Episódio: `numero`, `nome`, `sinopse`, `duracaoMin` (`runtime`, nulo se 0), `data` (`air_date`), `stillPath`, `nota` (só com votos) |
| Temporada: rota | `src/app/(app)/serie/[id]/temporada/[numero]/page.tsx`, protegida como `/serie` (o prefixo já está em `ROTAS_PROTEGIDAS`). `numero` inteiro de 1 a 999 (`lerId` com outro limite). Temporada 0 (especiais, que a página da série esconde), número inválido, série inexistente ou temporada inexistente: `notFound()`. TMDB fora do ar: o `ErroAoCarregar` |
| Temporada: dados da série | A página chama `obterSerie` (que já está em cache) para o nome da série e as temporadas vizinhas, e `obterTemporada` para os episódios, em paralelo |
| Temporada: layout | Ver "Layout da temporada" abaixo |
| Tempo da temporada | Na página da temporada: soma de `duracaoMin` dos episódios já exibidos, mais `duracaoEpisodioMin` da série para os que não têm duração. Na página da série, sem buscar cada temporada: `episodios × duracaoEpisodioMin`, com "cerca de". Formato: `formatarDuracao` do filme ("7h 30min"), arredondado para 5 min. Sem duração do episódio, nada |
| Situação da série | `status` do `/tv/{id}` (já vem na resposta, só falta no esquema zod): `Returning Series` → "Em exibição", `Ended` → "Encerrada", `Canceled` → "Cancelada", `In Production` / `Planned` → "Em produção". Outros valores, nada. Entra na linha de dados do cabeçalho, depois das temporadas |
| Próximo episódio | `next_episode_to_air.air_date`, no formato `dd/mm/aaaa` (fuso de São Paulo), abaixo da linha de dados: "Próximo episódio em 12/12/2026". Só com data futura |
| Trailer no funil | `ORIGENS_TRAILER` ganha `serie`, e `rotulos.ts` ganha "Página da série". A página da série passa `origem="serie"` ao `<Trailer>`. O evento é validado por zod no `POST /api/eventos`, sem `check` no banco: nenhuma migration |
| TMDB falso | Novas rotas `/3/search/tv` (com "nada" no texto, vazio) e `/3/tv/{id}/season/{n}` (temporada 1 com 8 episódios, um ainda não exibido e um sem duração; temporada 99, 404). `/3/tv/{id}` ganha `status` e `next_episode_to_air`. As respostas de filmes não mudam |
| Mobile | A seção usa o carrossel que já existe. A lista de episódios empilha a imagem acima do texto em 390 px |

### Gêneros de filme do perfil → gêneros de TV

A mesma tabela que o wizard de série já usa para os evitados ([series-noite](2026-11-18-series-noite.md)), agora também para os favoritos.

| Gênero de filme (ID) | Gênero de TV (ID) |
|---|---|
| Ação (28), Aventura (12) | Action & Adventure (10759) |
| Ficção científica (878), Fantasia (14) | Sci-Fi & Fantasy (10765) |
| Guerra (10752) | War & Politics (10768) |
| Animação (16), Comédia (35), Crime (80), Documentário (99), Drama (18), Família (10751), Faroeste (37), Mistério (9648) | o mesmo ID |
| Terror (27), Thriller (53), Romance (10749), História (36), Música (10402), Cinema TV (10770) | sem equivalente: o gênero é ignorado |

**Exclusão fixa da seção:** News (10763), Reality (10764), Talk (10767) e Kids (10762). Kids sai porque o dashboard não sabe se há criança na sala (no wizard, a pergunta "Com quem?" é que decide).

### Layout da temporada

1. **Voltar:** "← {nome da série}", para `/serie/{id}`.
2. **Cabeçalho:** pôster da temporada (sem pôster, o da série), "{nome da temporada}" (h1), "{série} · {ano} · 10 episódios · cerca de 7h 30min". Sinopse da temporada, se houver.
3. **Episódios** (h2): uma linha por episódio, com imagem (`still`, `w300`; sem imagem, o número), "{n}. {nome}", "45min · 03/10/2025 · ★ 8.1" (o que faltar é omitido) e a sinopse, limitada a 3 linhas. Episódio ainda não exibido: "Estreia em 12/12/2026", sem nota.
4. **Navegação:** "← Temporada anterior" e "Próxima temporada →", só quando existirem (pelas temporadas de `obterSerie`, sem a 0).

Título da aba: "{série}: {nome da temporada}", ou "Temporada não encontrada".

## Banco de dados

Nenhuma migration. As leituras novas usam a coluna `tipo` da [series-base](2026-11-18-series-base.md) e as políticas de RLS que já existem.

## Critérios de aceitação

1. **Conversão de gêneros** (`tests/unit/features/serie/generos.test.ts`): cada linha da tabela acima, sem repetição (Ação e Aventura viram um só 10759), e os sem equivalente somem. Os testes do wizard de série (`filtros-serie.test.ts`) continuam passando sem mudança.
2. **Seção do dashboard: consulta** (`tests/unit/features/serie/secao-series.test.ts`, API falsa injetada):
   1. favoritos [28, 27] pedem `generos` [10759], e só [27] não pede gênero;
   2. `semGeneros` traz os evitados convertidos e a exclusão fixa;
   3. séries com reação ou em lista saem; com menos de 4 restantes, a seção é `null`;
   4. a rodada muda a página pedida ao TMDB;
   5. TMDB com erro devolve a seção com `erro`.
3. **Leituras por tipo** (`tests/unit/features/{reacoes,listas}/consultas.test.ts`, banco em memória com filme e série de mesmo ID): `obterReacoes` e `idsNasListas` com `"serie"` trazem só a série; sem tipo, só o filme, como antes.
4. **Busca** (`tests/unit/features/busca/busca.test.tsx` e `tests/unit/lib/tmdb/series.test.ts`):
   1. `lerBusca` lê `tipo=serie`, e um valor inválido vira filme;
   2. `parametrosDaBusca` mantém o `tipo` só quando é série;
   3. `buscarSeries` chama `/search/tv` com o texto e a página e converte os resultados;
   4. com `tipo=serie`, os cartões levam a `/serie/{id}` e dizem "Série"; sem resultado, a mensagem de série;
   5. as abas aparecem só no modo "Por nome" e mantêm o `q`.
5. **Temporada** (`tests/unit/lib/tmdb/series.test.ts` e `tests/unit/features/serie/temporada.test.tsx`):
   1. `obterTemporada` converte os episódios (duração 0 vira nula, nota sem votos vira nula) e devolve `null` no 404;
   2. o tempo total soma as durações e usa a do episódio da série onde falta;
   3. o episódio não exibido mostra "Estreia em" e não mostra nota;
   4. as setas de temporada anterior e próxima aparecem só quando existem;
   5. a temporada 0 e um número inválido dão `notFound`.
6. **Página da série** (`tests/unit/features/serie/serie.test.tsx`):
   1. cada temporada é um link para `/serie/{id}/temporada/{n}` e mostra "cerca de" com o tempo total;
   2. a situação aparece traduzida, e um `status` desconhecido não aparece;
   3. "Próximo episódio em" aparece só com data futura.
7. **Funil** (`tests/unit/features/metricas/*`): `trailer_aberto` com origem `serie` é aceito pelo `POST /api/eventos` e aparece como "Página da série"; uma origem fora da lista continua recusada.
8. **E2E** (`tests/e2e/serie.spec.ts`, `tests/e2e/dashboard.spec.ts` e `tests/e2e/busca.spec.ts`, TMDB falso):
   1. o dashboard mostra "Séries para hoje à noite", e o cartão leva à página da série;
   2. a busca "Por nome" com a aba "Séries" encontra séries e leva à página da série;
   3. na página da série, a temporada 1 leva à lista de 8 episódios, com "Estreia em" no não exibido; "Próxima temporada →" leva à 2;
   4. a temporada 99 e a temporada 0 mostram o 404;
   5. em 390×844, a seção de séries e a lista de episódios não criam rolagem horizontal.
9. Os testes do dashboard, da busca, da página do filme, do wizard, do "Como foi?" e do MCP continuam passando sem mudança.
10. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` e `pnpm check:secrets` sem erros, e o CI verde.

## Ordem dos commits

Cada parte é um ou mais commits pequenos, com o teste junto. As partes B, C e D não dependem umas das outras e podem ser feitas em paralelo (uma branch ou um worktree por parte, todas com esta spec).

| Parte | Commits |
|---|---|
| A. Base | `generosEmTv` em `src/features/serie/generos.ts` (refactor do wizard); `obterReacoes` e `idsNasListas` com `tipo` |
| B. Dashboard | consulta da seção (lógica pura com API injetada); a seção na página com `Suspense` e o TMDB falso |
| C. Busca | `buscarSeries` e `/3/search/tv` no TMDB falso; `tipo` em `lerBusca` e `parametrosDaBusca`; abas e resultados de série |
| D. Episódios | `obterTemporada`, `status` e `next_episode_to_air` no esquema e no TMDB falso; a rota da temporada; links, tempo e situação na página da série; trailer com origem `serie` |
| E. E2E | os cenários do critério 8 |

## Fora do escopo

| Item | Por quê |
|---|---|
| Séries no motor de recomendação (parecidos, pontuação pelas reações) | a seção de séries usa só o perfil; misturar filmes e séries no motor muda a AP1 inteira |
| Séries no "Me surpreenda" e no MCP | continuam fora (pedido, 3.5) |
| Busca de séries "Por filtros" | os filtros da AP1 (duração, ano) são de filme; a busca por nome resolve o "achar a série" |
| Marcar episódios assistidos e progresso da série | é acompanhamento, não decisão (filtro da seção 2), e pediria uma tabela nova |
| Página do episódio | a linha da temporada já mostra tudo o que o TMDB tem do episódio |
| Séries parecidas | não pedido |
| Filtro "Filmes / Séries" em `/listas` | `/listas` já mostra os dois tipos, com o selo "Série" |
