# Spec: Séries, a página (`/serie/[id]`, reações e listas de séries)

- **Data:** 2026-11-18
- **Componente:** series-pagina (página da série; reações e listas com `tipo`; séries em `/listas`)
- **Status:** aprovada para implementação
- **Substitui:** nenhuma. É a segunda das três specs de séries (`series-base`, `series-pagina`, `series-noite`) e usa o que a [series-base](2026-11-18-series-base.md) entregou. Reaproveita o layout da [detalhes-filme](2026-10-05-detalhes-filme.md) e estende a [reacoes](2026-10-05-reacoes.md) e a [listas](2026-10-05-listas.md) para séries
- **Depende de:** [2026-11-18-series-base.md](2026-11-18-series-base.md) (coluna `tipo`, `obterSerie`, rotas `/tv/...` no TMDB falso)

## O quê

1. A página `/serie/{id}` mostra uma série: cabeçalho (com temporadas, duração do episódio e classificação), sinopse e criação, trailer, temporadas, onde assistir no Brasil e elenco.
2. Os botões de reação ("Não é pra mim", "Gostei", "Amei") e de lista ("Quero assistir", "Já assisti") funcionam na série, gravando `tipo = 'serie'`. Reagir à série nunca mexe no filme de mesmo ID, e vice-versa.
3. `/listas` mostra filmes e séries. O cartão da série leva para `/serie/{id}` e diz "Série".

## Por quê

[Pedido do cliente, seção 3.5](../docs/ap2/pedido-do-cliente.md#35-suporte-completo-a-séries): "séries passam a ser cidadãs do app, como os filmes".

| Exigência do pedido (3.5) | Como |
|---|---|
| "página de detalhes da série (`/serie/[id]`): sinopse, temporadas, duração média do episódio, elenco, onde assistir, trailer" | seção "Layout" abaixo, com os componentes da página do filme |
| "reações e listas aceitam séries" | `definirReacao`, `definirLista`, `obterReacao`, `obterStatusLista` e as duas actions recebem o tipo; `/listas` mostra as séries |

A página é o destino da série que o wizard vai sugerir na spec `series-noite`: sem ela, "Série" no wizard não teria onde mostrar onde assistir nem o trailer.

## Decisões técnicas

| Tema | Decisão |
|---|---|
| Rota | `src/app/(app)/serie/[id]/page.tsx`, na área logada como `/filme/[id]`. `/serie` entra em `ROTAS_PROTEGIDAS` (`src/proxy.ts`) |
| Dados | `obterSerie(id)` da spec `series-base`, numa chamada só, compartilhada com o `generateMetadata` por `cache()` |
| ID inválido ou inexistente | O mesmo `lerId` da página do filme (inteiro positivo de até 10 dígitos), levado para `src/features/filme/ler-id.ts`. Inválido ou `null` do TMDB → `notFound()` |
| TMDB fora do ar | `error.tsx` da rota, com "Tentar de novo" e "Voltar ao início". A tela de erro da página do filme vira o componente `ErroAoCarregar`, usado pelas duas rotas com a frase de cada uma |
| Reaproveitamento | O cabeçalho do filme vira o componente genérico `Cabecalho` (fundo, pôster, título, título original, linha de dados, gêneros, slogan, ações), e `CabecalhoFilme` passa a usá-lo sem mudar o que mostra. `Secao`, `Elenco`, `OndeAssistir`, `Trailer`, `BotoesReacao` e `BotoesLista` são os mesmos da página do filme. Os testes atuais da página do filme continuam iguais |
| Identificar o título | `src/lib/midia.ts`: `TipoMidia` (o enum `tipo_midia` do banco) e `Midia = { tipo, tmdbId }`. As funções de leitura e gravação recebem `number \| Midia`: um número sozinho é filme, como na AP1, então "Como foi?", MCP e os testes que já existem continuam iguais |
| Dados gravados da série | `definirReacao` e `definirLista` buscam título, pôster, ano e gêneros no TMDB pelo tipo (`obterFilme` ou `obterSerie`, em `src/lib/tmdb/titulo.ts`), nunca do navegador. Os gêneros de série são IDs de gênero de TV |
| Actions | `alternarReacao` e `alternarLista` leem o campo `tipo` do formulário (`filme` quando falta, para formulários antigos), validado por zod. Revalidam `/serie/{id}` ou `/filme/{id}`, conforme o tipo. Série inexistente: "Série não encontrada." |
| Botões | `BotoesReacao` e `BotoesLista` ganham a prop `tipo` (padrão `filme`), enviada num campo escondido |
| Erro "não encontrado" | O código `filme-nao-encontrado` de `ResultadoDefinir` não muda (o MCP e o "Como foi?" dependem dele); só a mensagem da action muda pelo tipo |
| Trailer | `<Trailer>` sem `origem` na página da série, então ela não registra `trailer_aberto`. Uma origem `serie` mudaria `ORIGENS_TRAILER`, que a branch `feat/metricas-funil` usa num `Record` de rótulos: fica para quando as duas estiverem na `main` |
| `/listas` | `obterItensLista` ganha o parâmetro `tipos` (padrão só `filme`, que o MCP continua usando). A página `/listas` pede filmes e séries. A reação de cada item é a do mesmo tipo e ID |
| Cartão | `CartaoFilme` aceita `tipo` opcional: série leva para `/serie/{id}` e mostra "Série" na linha de detalhes |
| Mobile | Mesmo layout responsivo da página do filme: em 390 px o cabeçalho empilha o pôster e os botões quebram linha |

### Layout da página da série

1. **Voltar:** link "← Voltar" para `/dashboard`.
2. **Cabeçalho** (o mesmo do filme): fundo, pôster, título (h1), título original se diferente, gêneros e slogan. Linha de dados: ano de estreia · "2 temporadas" (ou "1 temporada") · "Episódios de 45min" · classificação ("Livre" ou "12 anos") · "★ 8.4 (30.000 votos)". Itens ausentes são omitidos. Nas ações, os botões de reação e de lista da série.
3. **Sinopse** (h2): sem sinopse, "Sinopse não disponível em português." Abaixo, "Criação: Nome1, Nome2", se houver.
4. **Trailer** (h2), só se houver: o mesmo componente da página do filme.
5. **Temporadas** (h2), só se houver: uma linha por temporada, com pôster pequeno (sem pôster, o número), nome, ano e "10 episódios" (ou "1 episódio").
6. **Onde assistir no Brasil** (h2): o mesmo do filme; sem dados, "Não encontramos onde assistir esta série no Brasil."
7. **Elenco** (h2), se houver.

Não há "Séries parecidas": o pedido não pede, e o `obterSerie` da `series-base` não busca recomendações.

Título da aba: "{título} ({ano})", ou "Série não encontrada".

## Banco de dados

Nenhuma migration. A coluna `tipo` e a chave `(usuario_id, tipo, tmdb_id)` vêm da spec `series-base`.

## Critérios de aceitação

1. **Leituras e gravações com tipo** (`tests/unit/features/reacoes/consultas.test.ts` e `tests/unit/features/listas/consultas.test.ts`, banco em memória com um filme e uma série de mesmo ID):
   1. `obterReacao` e `obterStatusLista` com `{ tipo: "serie" }` devolvem o valor da série; com o número, o do filme;
   2. `definirReacao` e `definirLista` com `{ tipo: "serie" }` buscam a série e gravam `tipo: "serie"` com os dados dela; com `null`, apagam só a série;
   3. sem `buscar`, a série é buscada por `obterSerie` e o filme por `obterFilme` (`tests/unit/lib/tmdb/titulo.test.ts`).
2. **Actions** (`tests/unit/features/reacoes/actions.test.ts` e `tests/unit/features/listas/actions.test.ts`):
   1. com `tipo=serie`, gravam a série e revalidam `/serie/{id}`;
   2. sem `tipo`, gravam o filme e revalidam `/filme/{id}`, como antes;
   3. `tipo` fora da lista, sessão expirada e série inexistente viram as mensagens de erro.
3. **Componentes** (`tests/unit/features/serie/serie.test.tsx` e os testes de reações e listas):
   1. `BotoesReacao` e `BotoesLista` enviam o `tipo` recebido, e `filme` sem ele;
   2. a linha de dados da série mostra ano, temporadas, episódio, classificação e nota, omitindo o que falta, com singular e plural;
   3. `Temporadas` mostra nome, ano e episódios de cada temporada;
   4. `OndeAssistir` sem dados de série diz "esta série";
   5. `CartaoFilme` de série leva para `/serie/{id}` e mostra "Série".
4. **`/listas`** (`tests/unit/features/listas/consultas.test.ts`): com `tipos` filme e série, `obterItensLista` traz os dois itens de mesmo ID, cada um com seu tipo e sua reação; sem `tipos`, só o filme, como antes.
5. **E2E** (`tests/e2e/serie.spec.ts`, TMDB falso):
   1. `/serie/{id}` mostra título, sinopse, criação, "2 temporadas", "Episódios de 45min", as duas temporadas sem os especiais, Netflix, elenco e o trailer depois do clique;
   2. "Amei" e "Quero assistir" na série continuam marcados depois de recarregar, e a página do filme de mesmo ID continua sem reação e sem lista;
   3. a série marcada aparece em `/listas` com link para `/serie/{id}`;
   4. ID inválido e série inexistente mostram o 404; sem sessão, `/serie/{id}` leva ao login;
   5. em 390×844, os botões de reação e de lista ficam visíveis e clicáveis, sem rolagem horizontal.
6. Os testes da página do filme, das reações, das listas, do "Como foi?" e do MCP continuam passando sem mudança.
7. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` e `pnpm check:secrets` sem erros, e o CI verde.

## Fora do escopo

| Item | Onde fica |
|---|---|
| "Série" no wizard e "Como foi?" de série | spec `series-noite` |
| Link para séries no dashboard, na busca e no "Me surpreenda" | fora da AP2 (pedido, 3.5). Até a `series-noite`, a página da série só abre pelo endereço |
| Evento `trailer_aberto` com origem `serie` | depois de `feat/metricas-funil` estar na `main` (veja "Trailer" acima) |
| Episódios de cada temporada (`/tv/{id}/season/{n}`) | não pedido |
| Séries parecidas | não pedido |
| MCP com séries | fora da AP2 (pedido, 3.5): o MCP continua chamando as funções com o número, ou seja, só filmes |
