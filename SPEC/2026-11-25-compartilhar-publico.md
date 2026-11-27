# Spec: página pública do título compartilhado

- **Data:** 2026-11-25
- **Componente:** compartilhado (página pública) e noite (link do "Compartilhar")
- **Status:** aprovada para implementação
- **Substitui:** nenhuma. Ajusta [2026-11-18-noite-compartilhar.md](2026-11-18-noite-compartilhar.md): o link da mensagem deixa de ser `/filme/{id}` (ou `/serie/{id}`) e passa a ser a página pública desta spec. O item "Página pública do filme para quem recebe sem conta", que lá estava fora do escopo, entra aqui
- **Issue:** #53

## O quê

Depois do **"Vou ver esse!"**, o "Compartilhar" do wizard continua mandando a mesma mensagem:

> Hoje vamos ver {título}, termina às {hora}
> https://{endereço do app}/compartilhado/filme/{id}

O link agora leva a uma página **pública e só de leitura** do título, que abre sem conta:

- **`/compartilhado/filme/{id}`** e **`/compartilhado/serie/{id}`**: o cabeçalho que as páginas de filme e de série já usam (pôster, título, ano, duração do filme ou do episódio, nota, gêneros e o selo da classificação), a sinopse curta, **onde assistir** no Brasil e um convite: **"Criar conta"** e **"Entrar"**. O "Entrar" volta, depois do login, à página do título na área logada (`/filme/{id}` ou `/serie/{id}`).
- **Quem já está logado** e abre o link vai direto à página normal do título (`/filme/{id}` ou `/serie/{id}`), com reações, listas e o filtro de conteúdo da própria conta.
- **Prévia do link** (WhatsApp e outros): a página tem título, descrição e imagem de Open Graph (o pôster do TMDB), então a prévia mostra o filme em vez de uma prévia genérica do login.

`/filme` e `/serie` continuam protegidas. A página pública não lê nada do banco e não mostra nada de quem compartilhou.

## Por quê

[Pedido do cliente, seção 3.2](../docs/ap2/pedido-do-cliente.md#32-wizard-o-que-ver-hoje-a-principal): a pergunta 4 é "Com quem vai assistir?", e o compartilhar ([2026-11-18-noite-compartilhar.md](2026-11-18-noite-compartilhar.md)) existe para avisar quem vai ver junto. Na issue #53, o problema: `/filme` e `/serie` estão em `ROTAS_PROTEGIDAS` (`src/proxy.ts`), então quem recebe o link sem conta cai no login, sem saber qual filme é, e o robô do WhatsApp também é redirecionado ao login, e a prévia sai genérica, sem pôster. O aviso chega, mas não informa. Com a página pública, quem recebe vê o filme, a hora e onde assistir num toque, que é o filtro do cliente ("ajuda a decidir mais rápido?").

## Decisões técnicas

| Tema | Decisão |
|---|---|
| Rota | Uma rota só, `src/app/compartilhado/[tipo]/[id]/page.tsx`, fora de `(app)` (que exige usuário e onboarding) e fora de `ROTAS_PROTEGIDAS`. `tipo` só aceita `filme` e `serie`; ID inválido (`lerId`), tipo desconhecido ou título que o TMDB não conhece (404) dão `notFound()` |
| Caminho (`caminhoCompartilhado`) | Em `src/lib/midia.ts`, ao lado de `caminhoMidia`: `/compartilhado/{tipo}/{id}` |
| Link do "Compartilhar" (`urlDoFilme`) | A origem do navegador + `caminhoCompartilhado`. A mensagem (`mensagemDaNoite`) e o WhatsApp (`linkWhatsApp`) não mudam. O link da sala da "Noite a dois" **não** muda: a sala exige conta |
| Dados | `obterFilme` e `obterSerie` de `src/lib/tmdb/` (já `server-only`, com cache de 24 h), pela mesma `buscaPorId` das páginas de filme e de série: uma busca por renderização para a página e os metadados. Nenhum cliente novo do TMDB, nenhuma consulta ao banco |
| Quem está logado | `obterUsuarioAtual()` (a mesma do header, memoizada) e, com usuário, `redirect` para `caminhoMidia`. O ID é validado antes, para não redirecionar para uma página inexistente |
| O que a página mostra | `CabecalhoFilme` no filme e `Cabecalho` com `dadosDaSerie` na série (as mesmas linhas das páginas logadas: ano, duração ou "Episódios de 45min", nota e o `SeloClassificacao`), sinopse curta, `OndeAssistir` e o convite no lugar das ações. Sem trailer, elenco, parecidos e temporadas: a página só confirma o que é e onde ver |
| Sinopse curta (`sinopseCurta`) | Até 280 caracteres, cortada no fim da última palavra inteira, com "…". Sem sinopse, "Sinopse não disponível em português." |
| Convite | "Criar conta" leva a `/cadastro`; "Entrar" leva a `/login?next=/filme/{id}` (ou `/serie/{id}`), que o `sanitizarNext` já aceita. O cadastro passa pelo onboarding, que não guarda o `next` (fora do escopo) |
| Título +18 | Sem usuário não há filtro de conteúdo, e o link pode cair num grupo de família. Decisão conservadora: com classificação `18`, a página pública **não mostra nada do título** (nem nome, nem pôster, nem sinopse), só "Título para maiores de 18 anos" e o convite para entrar, que leva à página logada, onde vale o filtro da conta. Os metadados também não dizem o nome nem levam imagem. Títulos sem classificação aparecem normalmente, como no app sem filtro |
| Metadados (`metadadosCompartilhado`) | Título da aba `{título} ({ano})`, descrição com a sinopse curta, `openGraph` com `title`, `description`, `siteName: "Filme Certo"`, `locale: "pt_BR"`, `type` (`video.movie` ou `video.tv_show`) e a imagem; `robots: noindex`, porque a página existe para quem recebe o link, não para busca |
| Imagem de Open Graph | O pôster do TMDB em `w500` (500 × 750, URL absoluta do CDN), com o título como `alt`. Sem pôster, sem imagem. Não usamos `opengraph-image` com `ImageResponse`: baixar o pôster e montar uma imagem a cada prévia custaria tempo e código, e o próprio pôster já mostra o filme |
| `metadataBase` | Não definido. Todas as URLs dos metadados são absolutas (o pôster vem do CDN do TMDB), e um endereço fixo quebraria as prévias da Vercel e o E2E, que rodam em outras origens |
| Robôs de prévia | O Next 16 já entrega os metadados no `<head>` para os robôs (`htmlLimitedBots` inclui `WhatsApp`, `facebookexternalhit`, `Twitterbot`), sem streaming |
| Eventos | Nenhum, como no compartilhar original: a lista de eventos é fechada no banco |

## Banco de dados

Nenhuma mudança. A página não lê nem grava no banco.

## Código

```
src/lib/midia.ts                               caminhoCompartilhado
src/features/noite/compartilhar.ts             urlDoFilme aponta para a página pública
src/features/compartilhado/
  titulo.ts                                    lerCompartilhado, buscarCompartilhado (server-only)
  metadados.ts                                 sinopseCurta, metadadosCompartilhado
  components/pagina-compartilhada.tsx          a página, o convite e o aviso de +18
src/app/compartilhado/[tipo]/[id]/page.tsx     rota pública, generateMetadata e redirect de quem está logado
```

## Critérios de aceitação

1. **Link** (`tests/unit/features/noite/compartilhar.test.ts` e `tests/unit/lib/midia.test.ts`): `urlDoFilme` junta a origem e `/compartilhado/filme/{id}` (ou `/compartilhado/serie/{id}`); `caminhoCompartilhado` dá esses caminhos.
2. **Compartilhar** (`tests/unit/features/noite/compartilhar-noite.test.tsx`): o `href` do WhatsApp e a URL da Web Share levam à página pública do filme ou da série.
3. **Página** (`tests/unit/features/compartilhado/pagina.test.tsx`): o filme mostra título, duração ("2h 5min"), o selo da classificação, a sinopse curta, onde assistir e os links "Criar conta" (`/cadastro`) e "Entrar" (`/login?next=/filme/{id}`); a série mostra a duração do episódio e "Entrar" com `next=/serie/{id}`. Não há botões de reação nem de lista.
4. **+18** (mesmo arquivo): com classificação 18, a página não mostra o nome, o pôster nem a sinopse, e o "Entrar" leva à página logada do título.
5. **Rota** (mesmo arquivo): sem usuário, a página renderiza; com usuário, redireciona para `/filme/{id}` (ou `/serie/{id}`); ID inválido, tipo desconhecido ou título inexistente chamam `notFound()`, e o redirect não acontece com ID inválido.
6. **Metadados** (`tests/unit/features/compartilhado/metadados.test.ts`): título com o ano, descrição com a sinopse curta e `og:image` com o pôster `w500` do TMDB; sem pôster, sem imagem; +18 sem nome nem imagem; título inexistente com "Título não encontrado". `sinopseCurta` corta no fim de uma palavra, com "…", e não mexe em texto curto.
7. **E2E** (`tests/e2e/compartilhado.spec.ts`, sem sessão): `/compartilhado/filme/35020` abre sem ir ao login, mostra "Filme 35020", "2h 5min", onde assistir e o convite, e tem `og:image` com o pôster; `/compartilhado/serie/{id}` mostra a série; o +18 (`/compartilhado/filme/35021`) não mostra o nome; `/filme/35020` continua indo ao login. Logado, `/compartilhado/filme/35020` leva a `/filme/35020`.
8. **Wizard** (`tests/e2e/noite.spec.ts`): depois do "Vou ver esse!", o `href` do WhatsApp traz a mensagem de sempre e a URL absoluta de `/compartilhado/filme/35020`.
9. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` e `pnpm check:secrets` ficam sem erros (nenhum token do TMDB no bundle do cliente), com o CI verde.

## Fora do escopo

| Item | Por quê |
|---|---|
| Levar o `next` pelo cadastro e pelo onboarding | O cadastro sempre passa pelo onboarding, que hoje não guarda destino; mudar isso mexe no fluxo de autenticação inteiro. Quem cria conta chega ao dashboard e acha o título pela busca |
| `opengraph-image` gerada com `ImageResponse` (pôster + título + "termina às") | O pôster já identifica o filme na prévia; a hora já vai na mensagem. Gerar imagem por prévia é custo sem pedido do cliente |
| Mostrar trailer, elenco, temporadas e parecidos na página pública | A página confirma o que é e onde assistir; o resto fica na área logada, que é o convite para criar conta |
| Página pública da sala da "Noite a dois" | A sala grava votos e exige conta ([2026-11-18-noite-a-dois.md](2026-11-18-noite-a-dois.md)) |
| Evento de "link compartilhado aberto" | A lista de eventos é fechada no banco; medir exigiria migration e uma tabela que aceita anônimos |
