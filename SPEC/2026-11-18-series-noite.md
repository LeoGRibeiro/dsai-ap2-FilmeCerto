# Spec: Séries no wizard da noite e no "Como foi?"

- **Data:** 2026-11-18
- **Componente:** series-noite (pergunta "Filme ou série?", mapeamento de séries, resultado e "Como foi?" de série)
- **Status:** aprovada para implementação
- **Substitui:** nenhuma. É a última das três specs de séries (`series-base`, `series-pagina`, `series-noite`). Estende a [wizard-noite](2026-11-18-wizard-noite.md) (que tirou a pergunta "Filme ou série?" até as séries existirem), a [noite-ate-que-horas](2026-11-18-noite-ate-que-horas.md) e a [como-foi](2026-11-18-como-foi.md) (cujo "Fora do escopo" deixava o "Como foi?" de série para cá)
- **Depende de:** [2026-11-18-series-base.md](2026-11-18-series-base.md) (`descobrirSeries`, `obterSerie`, coluna `tipo`) e [2026-11-18-series-pagina.md](2026-11-18-series-pagina.md) (`/serie/{id}`, `definirReacao` e `definirLista` com `{ tipo, tmdbId }`)
- **Issue:** #8

## O quê

1. A pergunta **"Filme ou série?"** volta ao wizard. "Filme" continua sendo o caminho padrão; "Série" leva a um mapeamento próprio, com os gêneros de TV do TMDB.
2. O resultado de série mostra **"A série da sua noite"**, "Episódios de ~45 min", "Começando agora, o episódio termina às 23h40", onde assistir, trailer e o motivo. "Vou ver esse!" leva a `/serie/{id}`.
3. "Até que horas?" com série compara o horário com a duração do **episódio**.
4. "Vou ver esse!" de série grava `tipo = 'serie'` em `escolhas_noite`, e o "Como foi?" de série grava a reação e "Já assisti" da série, sem tocar no filme de mesmo ID.

## Por quê

[Pedido do cliente, seção 3.2](../docs/ap2/pedido-do-cliente.md#32-wizard-o-que-ver-hoje-a-principal) (pergunta 1: "a opção 'Série' só entra quando a seção 3.5 estiver pronta") e [seção 3.5](../docs/ap2/pedido-do-cliente.md#35-suporte-completo-a-séries): "opção 'Série' no wizard (pergunta 1)" e "o 'Como foi?' funciona para séries também", porque "à noite, muita gente quer 'um episódio de alguma coisa', não um filme de 2 horas". Com a base e a página da série prontas, o wizard pode sugerir séries.

## A pergunta "Filme ou série?" e os 4 cliques

O pedido tem duas exigências que não cabem juntas ao pé da letra: as quatro perguntas, "uma por tela", e "do dashboard até a primeira recomendação: no máximo 4 cliques". Com uma tela a mais, seriam 5 cliques (dashboard + 4 respostas). A decisão respeita o limite de cliques, que é o critério de pronto visto pelo usuário:

| Tema | Decisão |
|---|---|
| No dashboard | O botão de destaque **"O que ver hoje?"** continua levando ao wizard de filmes (`/noite`). Logo abaixo, o link **"Prefiro uma série"** leva a `/noite?tipo=serie`. O primeiro clique já responde a pergunta 1: **dashboard + 3 respostas = 4 cliques**, para filme e para série |
| Na 1ª tela do wizard | Acima de "Como você está se sentindo?", o grupo **"Filme ou série?"** com os cartões "Filme" e "Série" e o atual marcado (`aria-current`). Serve para quem abriu `/noite` direto ou mudou de ideia; trocar custa 1 clique a mais, só para quem troca |
| Padrão | Sem `tipo` na URL, é filme. O caminho de filme e as URLs que já existem não mudam |
| Contagem | O "1 de 3" continua contando as perguntas do clima. O tipo não entra na contagem anônima de climas nem nos eventos |
| Refazer as perguntas | Mantém o tipo: quem estava em série volta a `/noite?tipo=serie` |

## Mapeamento das respostas para os filtros de série

Esta é a tabela que o cliente pediu para revisar, a mesma da spec do wizard, agora para séries. Os IDs são os gêneros de TV do TMDB (`/genre/tv/list`), uma lista diferente da de filmes: não existem "Terror", "Thriller", "Romance" nem "História" para séries, e ação, ficção e guerra são gêneros combinados.

| ID | Gênero de TV | ID | Gênero de TV |
|---|---|---|---|
| 10759 | Action & Adventure (Ação e Aventura) | 10751 | Família |
| 16 | Animação | 10762 | Kids |
| 35 | Comédia | 9648 | Mistério |
| 80 | Crime | 10765 | Sci-Fi & Fantasy (Ficção e Fantasia) |
| 99 | Documentário | 10768 | War & Politics (Guerra e Política) |
| 18 | Drama | 10763, 10764, 10767 | News, Reality, Talk |

### Experiência: define o gênero (o "tom")

As mesmas regras dos filmes: a 1ª rodada usa o tom 1, "Não é o clima" passa ao seguinte, "+" exige os gêneros juntos e o nome do tom vai no motivo.

| Experiência | Tom 1 | Tom 2 | Tom 3 | Sempre exclui |
|---|---|---|---|---|
| `rir` | comédia: Comédia 35 | comédia animada: Animação 16 + Comédia 35 | comédia dramática: Comédia 35 + Drama 18 | Crime 80, Mistério 9648, War & Politics 10768 |
| `emocionar` | drama: Drama 18 | drama de família: Drama 18 + Família 10751 | drama de guerra e política: Drama 18 + War & Politics 10768 | |
| `susto` | mistério sobrenatural: Mistério 9648 + Sci-Fi & Fantasy 10765 | fantasia sombria: Sci-Fi & Fantasy 10765 + Drama 18 | mistério sombrio: Mistério 9648 + Drama 18 | Comédia 35, Família 10751, Kids 10762 |
| `tenso` | policial: Crime 80 | investigação: Crime 80 + Mistério 9648 | suspense político: War & Politics 10768 + Drama 18 | Comédia 35 |
| `pensar` | ficção científica: Sci-Fi & Fantasy 10765 | mistério: Mistério 9648 + Drama 18 | documentário: Documentário 99 | Kids 10762 |
| `distrair` | aventura: Action & Adventure 10759 | animação: Animação 16 | comédia: Comédia 35 | War & Politics 10768 |

Sem gênero de terror para séries, `susto` usa mistério e fantasia sem comédia nem infantil, que é onde o TMDB classifica as séries de terror.

**Toda série** exclui News 10763, Reality 10764 e Talk 10767: o wizard sugere uma série para ver um episódio, não um telejornal, um reality ou um programa de entrevistas.

### Humor: ajusta duração do episódio, época e exclusões

| Humor | Ajuste |
|---|---|
| `cansado` | episódio de até **45 min** (`with_runtime.lte`); ordena por popularidade |
| `animado` | nenhum |
| `pra-baixo` | exclui Crime 80, Mistério 9648 e War & Politics 10768 (os "pesados" de TV) |
| `nostalgico` | estreia até 31/12/2005 (`first_air_date.lte`) |
| `ansioso` | exclui Crime 80, Mistério 9648 e War & Politics 10768 |
| `de-boa` | nenhum |

Como nos filmes, a exclusão do humor nunca tira um gênero do tom atual (`ansioso` + `susto` mantém Mistério).

### Companhia: classificação e ordem

| Companhia | Ajuste |
|---|---|
| `sozinho`, `a-dois` | nenhum |
| `familia` | classificação indicativa brasileira **até 12 anos**, a mesma `CLASSIFICACAO_FAMILIA` dos filmes. O `/discover/tv` não filtra por classificação (aviso da `series-base`), então ela é **conferida série a série** na classificação BR de `obterSerie`. Série sem classificação BR não entra, como os filmes |
| `amigos` | ordena por popularidade |

### Gêneros evitados do perfil

O onboarding guarda gêneros **de filme**. Para séries, eles viram gêneros de TV por esta tabela, e continuam absolutos: entram em `without_genres`, são conferidos no resultado e pulam o tom que os exige.

| Evitado (filme) | Vira (TV) |
|---|---|
| Ação 28, Aventura 12 | Action & Adventure 10759 |
| Ficção científica 878, Fantasia 14 | Sci-Fi & Fantasy 10765 |
| Guerra 10752 | War & Politics 10768 |
| Animação 16, Comédia 35, Crime 80, Documentário 99, Drama 18, Família 10751, Faroeste 37, Mistério 9648 | o mesmo ID |
| Terror 27 | sem gênero de TV: a experiência `susto` de série fica sem tom, e a tela oferece refazer as perguntas (como um tom evitado nos filmes) |
| Thriller 53, Romance 10749, História 36, Música 10402, Cinema TV 10770 | sem equivalente em TV; não há o que excluir |

### Regras fixas de série

| Regra | Decisão |
|---|---|
| Piso de qualidade | o mesmo dos filmes: nota ≥ 6,5 e pelo menos 300 votos |
| Ordem | a mesma dos filmes: por nota, salvo `cansado` ou `amigos` (popularidade) |
| "Muito longo" | a próxima rodada limita o **episódio** a 15 min a menos que o recusado, nunca abaixo de 20 min. Sem duração conhecida, tira 15 min do limite atual (ou de 60). Vale junto com o `cansado`: fica o menor |
| "Até que horas?" | o `tempo` limita o **episódio**, não a série: "começando agora, o episódio termina até as 23h". Com menos de **20 minutos**, a tela diz "Não dá tempo de ver um episódio até as 23h" sem consultar o TMDB. Com horário, a duração do episódio também é conferida nos detalhes, como nos filmes |
| Nunca recomendar | séries em "Já assisti", séries com qualquer reação e o que já foi mostrado nesta sessão. Só as linhas `tipo = 'serie'`: um filme visto com o mesmo ID não esconde a série |
| Streamings | primeiro só nos streamings da pessoa, depois sem filtro de provedor, como nos filmes (os IDs de provedor são os mesmos) |

## Decisões técnicas

| Tema | Decisão |
|---|---|
| Estado | `EstadoNoite` ganha `tipo` (`filme` ou `serie`), lido de `tipo` na URL. Valor inválido é filme. `urlDaNoite` escreve `tipo=serie` no começo, e nada para filme |
| `max` na URL | O mínimo aceito vem do tipo: 80 para filme (como antes) e 20 para série |
| Mapeamento | `src/features/noite/mapeamento-serie.ts`, com as tabelas acima. `mapeamento.ts` reúne as tabelas de filme e de série num `Mapeamento` por tipo (tons, humor, companhia, exclusões fixas, "Muito longo", tempo mínimo e conversão dos evitados). As tabelas de filme não mudam |
| Filtros | `filtrosDaNoite` recebe o tipo na rodada e usa o mapeamento dele. Devolve também os evitados já convertidos (para a conferência do resultado) e, para série em `familia`, a classificação a conferir nos detalhes |
| Recomendação | `recomendarNoite` recebe `tipo` e a API do tipo (`descobrirFilmes`/`obterFilme` ou `descobrirSeries`/`obterSerie`). A série vira o mesmo formato do filme na tela, com `duracaoMin` = duração do episódio. Sem `tipo`, é filme: as chamadas que já existem não mudam |
| Conferência nos detalhes | Com horário ou com classificação a conferir, a rodada detalha até **3 vezes** os títulos que vai mostrar e fica com os primeiros que passam. Sem conferência, detalha só os que vai mostrar, como antes |
| Exclusões | `idsParaExcluir(supabase, tipo)` lê "Já assisti" e reações só do tipo pedido |
| Tela do resultado | `FilmeNaTela` ganha `tipo`. Série: "A série da sua noite", "2019 · Episódios de ~45 min", "Começando agora, o episódio termina às 23h40". Esqueleto: "Procurando a série da sua noite…". Sem resultado: "não sobrou nenhuma série" |
| "Vou ver esse!" | `VouVerEsse` recebe o tipo; a action `escolherFilme(tmdbId, tipo)` busca o título no TMDB pelo tipo (`buscarTitulo`) e grava `tipo` em `escolhas_noite`. O link de detalhes vai para `/serie/{id}` |
| "Já vi" | "Marcar e trocar" envia `tipo` para `alternarLista`, que já aceita séries |
| "Como foi?" | `obterComoFoi` lê o `tipo` da escolha; o cartão leva a `/serie/{id}`. `gravarResposta` passa `{ tipo, tmdbId }` para `definirReacao` e `definirLista`, e a action revalida `/serie/{id}` |
| Eventos | Nenhum evento novo nem dado novo: `wizard_*` e `como_foi_*` não dizem se foi filme ou série |

## Banco de dados

Nenhuma migration. `escolhas_noite.tipo` existe desde a spec do "Como foi?", e `reacoes.tipo` e `lista_itens.tipo` desde a `series-base`.

## Código

```
src/features/noite/
  mapeamento-serie.ts   tabelas de série (tons, humor, companhia, evitados, "Muito longo", tempo mínimo)
  mapeamento.ts         Mapeamento por tipo (MAPEAMENTOS)
  filtros.ts            filtrosDaNoite com o tipo
  estado.ts             tipo em EstadoNoite, lerEstado, urlDaNoite, proximaRodada; inicioDaNoite(tipo)
  recomendar.ts         séries, conferência da classificação e folga de candidatos
  consultas.ts          idsParaExcluir e obterNoite por tipo
  components/           botao-noite (série), pergunta-noite ("Filme ou série?"), resultado, destaque,
                        opção, termina-as, sem-noite, sem-tempo, esse-nao, recomendacao-noite
src/features/como-foi/  actions, gravar, consultas, vou-ver-esse e pergunta-como-foi com o tipo
```

## Critérios de aceitação

1. **Mapeamento de série** (`tests/unit/features/noite/filtros-serie.test.ts`, de tabela):
   1. cada experiência gera os gêneros de TV do tom 1, e "Não é o clima" passa aos tons seguintes;
   2. toda série exclui News, Reality e Talk; `rir` exclui Crime, Mistério e War & Politics;
   3. `cansado` limita o episódio a 45 min; `pra-baixo` e `ansioso` excluem os pesados de TV, menos o gênero do tom;
   4. `familia` não envia classificação ao TMDB e pede a conferência até 12 anos;
   5. os evitados viram gêneros de TV pela tabela; Terror evitado deixa `susto` sem tom (`null`);
   6. o caminho de filme continua igual (os testes de `filtros.test.ts` não mudam).
2. **Estado** (`estado.test.ts`): `lerEstado` lê `tipo=serie` e trata o resto como filme; `urlDaNoite` escreve `tipo=serie` primeiro e é o inverso de `lerEstado`; `max` de 30 vale para série e não para filme; "Muito longo" de série reduz 15 min do episódio com piso de 20; `inicioDaNoite` mantém o tipo.
3. **Recomendação** (`recomendar.test.ts`, API falsa): com `tipo: "serie"` chama `descobrirSeries` e `obterSerie` (nunca as de filme) e devolve a duração do episódio; em `familia`, descarta série acima de 12 anos ou sem classificação e completa com as seguintes; com horário, descarta episódio mais longo que o `tempo`; `idsParaExcluir(..., "serie")` lê só as linhas de série.
4. **Telas** (unitários): o dashboard tem "O que ver hoje?" (`/noite`) e "Prefiro uma série" (`/noite?tipo=serie`); a 1ª pergunta mostra "Filme ou série?" com o tipo atual marcado; o resultado de série mostra "A série da sua noite", "Episódios de ~45 min" e o episódio terminando às; "Vou ver esse!" chama `escolherFilme` com o tipo e leva a `/serie/{id}`; "Marcar e trocar" envia o tipo; "Refazer as perguntas" mantém o tipo; sem tempo, "Não dá tempo de ver um episódio".
5. **"Como foi?" de série** (`tests/unit/features/como-foi/`): `escolherFilme(id, "serie")` grava `tipo = 'serie'` com o título da série; `obterComoFoi` devolve o tipo e o cartão leva a `/serie/{id}`; responder "Amei" a uma escolha de série grava a reação e "Já assisti" com `{ tipo: "serie" }` e revalida `/serie/{id}`.
6. **E2E** (`tests/e2e/noite.spec.ts`, TMDB falso): do dashboard, "Prefiro uma série" + 3 respostas mostram "A série da sua noite" com uma "Série …", "Episódios de ~45 min" e o episódio terminando às; "Vou ver esse!" leva a `/serie/{id}`; o mesmo em 390 × 844, com os botões principais visíveis e sem rolagem horizontal; o caminho de filme continua passando como antes.
7. **E2E do "Como foi?" de série** (`tests/e2e/como-foi.spec.ts`): uma escolha de série de 4 horas atrás pergunta "Como foi Série {id}?"; "Amei" marca "Amei" e "Já assisti" em `/serie/{id}`, e o filme de mesmo ID continua sem reação.
8. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` e `pnpm check:secrets` sem erros, e o CI verde.

## Fora do escopo

| Item | Por quê |
|---|---|
| Série no dashboard, no motor, no "Me surpreenda", na busca e no MCP | fora da AP2 (pedido, 3.5) |
| Contar filme × série nas métricas | o pedido (3.1) não pede; os eventos ficam como estão |
| Temporada ou episódio específico ("comece pela 2ª temporada") | não pedido: a sugestão é a série, e a página dela mostra as temporadas |
| Palavras-chave para terror em série | as palavras-chave do TMDB são irregulares (spec do wizard); os pares de gêneros de TV bastam |
| Classificação de série pelo `/discover/tv` | o TMDB não oferece; a conferência série a série resolve |
