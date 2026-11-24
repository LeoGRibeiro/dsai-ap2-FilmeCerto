# Filme Certo

**O filme certo para hoje à noite.** O Filme Certo pergunta o que você curte, o que prefere evitar e quais streamings assina. Depois sugere filmes para o seu gosto e mostra onde assistir cada um no Brasil. As sugestões mudam conforme você avalia os filmes.

### Acesse: **<https://dsai-ap2-filme-certo.vercel.app/>**

[![CI](https://github.com/LeoGRibeiro/dsai-ap2-FilmeCerto/actions/workflows/ci.yml/badge.svg)](https://github.com/LeoGRibeiro/dsai-ap2-FilmeCerto/actions/workflows/ci.yml)

| Endereço                                             | O que é                                                                           |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| <https://dsai-ap2-filme-certo.vercel.app/>           | O app (deploy da `main` na Vercel)                                                |
| <https://dsai-ap2-filme-certo.vercel.app/api/health> | SHA do commit servido, para conferir que a produção é o último da `main`          |
| <https://dsai-ap2-filme-certo.vercel.app/noite>      | Wizard "O que ver hoje?" (exige login)                                            |
| <https://dsai-ap2-filme-certo.vercel.app/metricas>   | Métricas de uso (só para contas em `equipe_metricas`)                             |
| <https://dsai-ap2-filme-certo.vercel.app/api/mcp>    | Servidor MCP para agentes (veja [abaixo](#use-o-filme-certo-pelo-seu-agente-mcp)) |
| <https://github.com/LeoGRibeiro/dsai-ap2-FilmeCerto> | Este repositório (fork do projeto da AP1)                                         |

Projeto da disciplina **Desenvolvimento de Software Apoiado por IA** (UFPA, 2026).

| Etapa | Quem                                                                                                                                       | Papel                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| AP1   | Alexsandro Costa ([@sandroccosta](https://github.com/sandroccosta)) e Jonathan Fagundes ([@jonathanfufu](https://github.com/jonathanfufu)) | Criaram o Filme Certo; na AP2, são os clientes                                                 |
| AP2   | Leonardo Ribeiro ([@LeoGRibeiro](https://github.com/LeoGRibeiro)) e Lucas Reis ([@Lucas-xps](https://github.com/Lucas-xps))                | Evoluíram o projeto neste fork, a partir do [pedido do cliente](docs/ap2/pedido-do-cliente.md) |

## O que mudou na AP2

O pedido dos clientes tem um filtro: cada mudança precisa ajudar a pessoa a **decidir mais rápido** o que ver hoje. Escopo e decisões gerais em [`SPEC/2026-11-17-visao-geral-ap2.md`](SPEC/2026-11-17-visao-geral-ap2.md).

- **"O que ver hoje?"** (pedido 3.2 e 3.4): um botão no topo do início abre um wizard de três perguntas (humor, experiência e companhia), uma por tela, com "Voltar". Em 4 cliques ele mostra um filme com o motivo, onde assistir, o trailer e a hora em que termina se começar agora. "Esse não" pede o motivo e troca a sugestão por outra que corrige esse motivo, agora com mais duas opções menores, até o limite de trocas. "Já vi" tira o título da noite e oferece marcar "Já assisti". Nada do wizard vira preferência: as respostas ficam só no endereço. O mapeamento das respostas para gêneros, tom e classificação está em tabela na spec [`2026-11-18-wizard-noite`](SPEC/2026-11-18-wizard-noite.md).
- **"Até que horas?"**: um ajuste opcional no resultado que só sugere títulos que terminam a tempo. Dá para escolher um tempo a partir de agora (1h30 a 3h, com o horário de término ao lado) ou outro horário no seletor do celular. A conta é feita no navegador.
- **Filme ou série** (pedido 3.5): a primeira tela do wizard tem o grupo "Filme ou série?", com Filme já marcado (filme continua em 4 cliques; série, em 5). Para série, o wizard usa um mapeamento próprio de gêneros de TV e mostra a duração do episódio. Séries têm página própria (`/serie/[id]`), com a situação da série, o tempo de cada temporada e a página de cada temporada com os episódios (`/serie/[id]/temporada/[n]`). Reações e listas aceitam séries, o início tem a seção "Séries para hoje à noite" e a busca por nome tem a aba "Séries".
- **Acompanhar série** (primeira parte, PR #46): a página da série tem o botão "Acompanhar", que guarda a série na conta (tabela `acompanhamentos_series`). A verificação periódica de episódios novos e a tela de avisos ainda não foram feitas; o plano está na spec [`2026-11-24-aviso-episodio-novo`](SPEC/2026-11-24-aviso-episodio-novo.md).
- **Filtro por idade e classificação indicativa** (pedido novo do cliente, 23/11): as páginas de filme e de série mostram o selo da classificação ("14") ao lado da nota. No `/perfil`, a seção "Conteúdo sensível" tem quatro opções: sem filtro (padrão), até 10 anos, até 14 anos e sem conteúdo +18. Com filtro, as recomendações (início, wizard, "Me surpreenda", noite a dois e parecidos) só trazem o que está dentro da idade; o que passa do limite abre só pela busca ou pelo link direto, com um aviso no topo; e o que é +18 some de tudo, sem imagens, e o link direto mostra só "Este título não está disponível com o filtro desta conta".
- **Navegação rápida** (#42): cada clique na área logada troca a tela na hora, com um esqueleto no formato da página, e o servidor valida a sessão sem ir ao Auth a cada requisição. Medido na produção: do clique à tela nova, de 0,5–1,8 s para 2–36 ms nos links do topo e dos cartões, e de 0,8–1,2 s para 0,3–0,4 s nas respostas do wizard.
- **Acessibilidade do wizard**: navegação por teclado e foco levado para a etapa nova em "Esse não" e "Já vi".
- **"Vou ver esse!" e "Como foi?"** (pedido 3.3): a escolha da noite fica registrada, e na volta ao app o início pergunta como foi. "Amei", "Gostei" ou "Não é pra mim" viram reação e marcam o título como "Já assisti", sem a pessoa precisar voltar à página do filme.
- **Compartilhar**: depois da escolha, "Compartilhar" manda "Hoje vamos ver {título}, termina às {hora}" pela Web Share API ou pelo WhatsApp.
- **Noite a dois** (pedido 3.6): "Vamos escolher juntos" cria uma sala com link; cada pessoa responde no próprio celular e o app sugere um filme que combine as duas respostas, com o motivo. A sala expira e as respostas não viram preferência.
- **Métricas de uso** (pedido 3.1): o app registra eventos anônimos de uso, e a página `/metricas` (só para a equipe) mostra os totais, o funil do wizard (abriu → recomendação → "Vou ver esse!"), as trocas por motivo, as respostas do "Como foi?" e os trailers por origem.
- **Qualidade e processo**: deploy próprio (Vercel + Supabase), `next` atualizado para 16.4.6 (dois alertas críticos de segurança), e o CI passou a medir cobertura das linhas novas, duplicação (`jscpd`, limite de 5%), segredos no histórico (`gitleaks`) e alertas críticos de dependências.

### Quanto código entrou

`cloc --diff` contra a linha de base `4ac8b98` (10.643 linhas de código), sem Markdown, JSON, YAML, CSV, texto, SVG, lockfiles e `prompts/`. Medido em 24/11 na `main` (`7038a2e`, depois do PR #46):

| Parte                           | Arquivos novos | Linhas novas | Linhas alteradas | Linhas removidas |
| ------------------------------- | -------------: | -----------: | ---------------: | ---------------: |
| Aplicação, migrations e scripts |            113 |        6.684 |              184 |              196 |
| Testes (`tests/`)               |             80 |        8.869 |               30 |               32 |
| **Total**                       |        **193** |   **15.553** |          **214** |          **228** |

Comando (o executável do `cloc` 1.98 fica fora do repositório):

```bash
cloc --git --diff 4ac8b98 HEAD \
  --exclude-dir=node_modules,vendor,dist,build,prompts \
  --exclude-lang=Markdown,JSON,YAML,CSV,Text,SVG \
  --not-match-f='(lock|\.min\.)'
```

A linha "Aplicação" acrescenta `tests` ao `--exclude-dir`, e a linha "Testes" acrescenta `--match-d='tests'`. No Windows, rode pelo PowerShell: no Git Bash, o `cloc --git` falha por causa do `tar`.

Cada funcionalidade tem issue, spec commitada antes do código e PR aprovado pelo outro integrante. As regras de trabalho estão em [`AGENTS.md`](AGENTS.md), e o plano e o estado, em [`TASKS.md`](TASKS.md).

### Situação dos critérios na entrega (24/11)

Medido na `main` em `7038a2e`, com os comandos da seção 0 e da seção 10 do [`AGENTS.md`](AGENTS.md):

| Critério                                  | Mínimo       | Medido                                                                            |
| ----------------------------------------- | ------------ | --------------------------------------------------------------------------------- |
| Linhas novas (`cloc --diff`)              | 100 mil      | 15.553 (abaixo)                                                                   |
| Commits com `Agent:` e `Spec:`            | 80%          | 210 de 248 (84,7%), pelo parser de trailers do git                                |
| Parcela de commits de cada integrante     | 30% cada     | Leonardo 229, Lucas 18 (7,3%, abaixo), 1 sem autor identificado                   |
| Spec antes do código                      | 100%         | cada spec da AP2 num commit só dela, antes do primeiro commit que a cita          |
| Mediana do tamanho dos commits            | < 400 linhas | 110 (medido em 24/11, antes do PR #46)                                            |
| Dias com commit                           | 2 por semana | 17, 18, 19, 20, 23 e 24/11                                                        |
| Cobertura das linhas novas                | 70%          | 92,1% (medido em 24/11, antes do PR #46, que entrou sem testes)                   |
| Duplicação (`jscpd`, no CI)               | até 5%       | 1,04%                                                                             |
| CI                                        | verde / 80%  | `main` verde; 86% dos builds verdes                                               |
| Segredos e alertas críticos               | zero         | `gitleaks` sem vazamento; 0 alertas críticos                                      |
| URL pública com o último commit da `main` | no ar        | `/api/health` devolve `7038a2e`                                                   |
| Sessões e custos registrados              | 100%         | [`prompts/sessoes/`](prompts/sessoes/) e [`prompts/custos.md`](prompts/custos.md) |

## Como funciona

1. **Conte seu gosto.** No cadastro, um passo a passo de 7 perguntas: gêneros favoritos, gêneros que você não quer ver, duração preferida, com que frequência assiste, quais streamings assina, alguns filmes que você ama e, só pela capa, quais você não assistiria. Só as três primeiras são obrigatórias.
2. **Receba sugestões.** O início mostra seções feitas para você: "Nos seus streamings", "Escolhidos para você", "Porque você amou…" e uma por gênero favorito. Cada filme diz por que foi recomendado.
3. **Veja onde assistir.** A página de cada filme traz sinopse, trailer, elenco e onde ele está disponível no Brasil: assinatura, aluguel ou compra.

## O que dá para fazer

- **Me surpreenda:** um globo de pôsteres gira e sorteia um filme. Ele mistura filmes do seu gosto com bons filmes fora da sua bolha, sem repetir.
- **Avaliar filmes:** "Não é pra mim", "Gostei" e "Amei". As avaliações ajustam as próximas recomendações, e cada "Amei" gera uma seção de filmes parecidos.
- **Minhas listas:** "Quero assistir" e "Já assisti".
- **Buscar:** por nome ou por filtros (gênero, ano, duração e ordem).
- **Perfil:** trocar o nome, todas as preferências do cadastro e o filtro por idade.
- **O que ver hoje?:** o wizard da noite, sozinho ou a dois, para filme ou série.

### Como as recomendações são feitas

O motor não usa rede neural. Ele monta consultas ao catálogo do [TMDB](https://www.themoviedb.org/) a partir das suas preferências e corta os gêneros que você evita. Em seguida, pontua cada candidato pela afinidade com os gêneros, pela nota e pela popularidade, e junta as recomendações do TMDB para os filmes que você amou. Os detalhes estão em [`SPEC/2026-10-05-motor-recomendacao.md`](SPEC/2026-10-05-motor-recomendacao.md).

## Use o Filme Certo pelo seu agente (MCP)

O Filme Certo também é um servidor [MCP](https://modelcontextprotocol.io): um agente de IA pode buscar filmes, pedir recomendações e cuidar das suas listas por você.

1. Crie sua conta em <https://dsai-ap2-filme-certo.vercel.app/> e conte seus gostos.
2. No Claude Code:

   ```bash
   claude mcp add --transport http filme-certo https://dsai-ap2-filme-certo.vercel.app/api/mcp
   ```

   Use `--scope user` para o servidor valer em qualquer pasta. Sem a opção, ele vale só na pasta em que o comando foi rodado. Quem usa só a extensão do VS Code não tem o `claude` no PATH: o executável fica em `~/.vscode/extensions/anthropic.claude-code-*/resources/native-binary/`.

3. Abra o Claude Code (`claude`), rode `/mcp`, escolha `filme-certo` e depois **Authenticate**. O navegador abre o Filme Certo: entre com sua conta e clique em **Autorizar**. Se você pedir uma tarefa antes de entrar, o agente oferece o link de login sozinho.
4. Peça em português o que quiser fazer. O agente escolhe as tools. Exemplos:
   - "Liste as tools do filme-certo e explique cada uma."
   - "Recomende 3 filmes que estejam nos meus streamings e me diga onde ver cada um."
   - "Onde posso assistir Duna?"
   - "Coloque Interestelar na minha lista Quero assistir."
   - "Eu amei Coraline, registre isso."

O Claude Code pede sua confirmação antes de cada tool de escrita (`marcar_na_lista` e `avaliar_filme`) se o projeto tiver estas permissões em `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "mcp__filme-certo__buscar_filmes",
      "mcp__filme-certo__detalhes_filme",
      "mcp__filme-certo__recomendar_filmes",
      "mcp__filme-certo__ver_listas"
    ],
    "ask": ["mcp__filme-certo__marcar_na_lista", "mcp__filme-certo__avaliar_filme"]
  }
}
```

Para sair, use "Clear authentication" no `/mcp` ou rode `claude mcp remove filme-certo`.

| Tool                | O que faz                                 |
| ------------------- | ----------------------------------------- |
| `buscar_filmes`     | busca por nome                            |
| `detalhes_filme`    | sinopse, elenco e onde assistir no Brasil |
| `recomendar_filmes` | recomendações do motor, com o motivo      |
| `ver_listas`        | "Quero assistir" e "Já assisti"           |
| `marcar_na_lista`   | põe ou tira um filme das listas           |
| `avaliar_filme`     | "Amei", "Gostei" ou "Não é pra mim"       |

O agente só enxerga a sua conta: o acesso usa o seu login, e o banco aplica as mesmas regras do site. Detalhes em [`SPEC/2026-10-13-mcp.md`](SPEC/2026-10-13-mcp.md).

## Tecnologias

| Camada               | Tecnologia                                                       |
| -------------------- | ---------------------------------------------------------------- |
| Aplicação            | Next.js 16 (App Router), React 19, TypeScript (strict)           |
| Interface            | Tailwind CSS 4, shadcn/ui e Base UI, fonte Archivo               |
| Banco e autenticação | Supabase (Postgres + Supabase Auth, com RLS)                     |
| Catálogo de filmes   | API do TMDB (v3), com dados de onde assistir da JustWatch        |
| Validação            | zod                                                              |
| Agentes (MCP)        | mcp-handler + SDK MCP v2, OAuth 2.1 Server do Supabase           |
| Testes               | Vitest + Testing Library (unidade/componentes), Playwright (E2E) |
| CI e deploy          | GitHub Actions e Vercel                                          |

## Como rodar localmente

Pré-requisitos: Node.js 22.12+ (veja `.nvmrc`), pnpm 10 e, para os testes de integração e E2E, Docker Desktop.

```bash
pnpm install
cp .env.example .env.local   # preencha com as chaves do Supabase e do TMDB
pnpm dev                     # http://localhost:3000
```

| Comando                     | O que faz                                                                      |
| --------------------------- | ------------------------------------------------------------------------------ |
| `pnpm dev`                  | Servidor de desenvolvimento                                                    |
| `pnpm build` / `pnpm start` | Build e servidor de produção                                                   |
| `pnpm lint`                 | ESLint                                                                         |
| `pnpm typecheck`            | Checagem de tipos (`tsc --noEmit`)                                             |
| `pnpm test`                 | Testes unitários e de componentes (Vitest)                                     |
| `pnpm test:coverage`        | Os mesmos testes, com cobertura em `coverage/` (`lcov.info` e relatório HTML)  |
| `pnpm coverage:diff <base>` | Cobertura das linhas novas contra a base (ex.: `origin/main`, `4ac8b98`)       |
| `pnpm test:integration`     | Testes contra o Supabase local: trigger e RLS (requer `pnpm db:start`)         |
| `pnpm test:e2e`             | Testes ponta a ponta (Playwright; faz o build apontando para o Supabase local) |
| `pnpm check:secrets`        | Garante que segredos não vazaram para o bundle do navegador                    |
| `pnpm check:duplicacao`     | Duplicação do código com o `jscpd` (falha acima de 5%; veja `.jscpd.json`)     |
| `pnpm db:start`             | Sobe o Supabase local em Docker e aplica as migrations                         |
| `pnpm db:types`             | Gera `src/lib/supabase/database.types.ts` a partir do banco local              |

Os testes de integração e E2E rodam contra o Supabase local, nunca contra o banco de produção. Nos E2E, um servidor falso faz o papel do TMDB.

## Como o projeto foi feito

Cada parte do sistema começou por uma **spec**, commitada antes do código, com o quê, por quê, critérios de aceitação e o que ficou fora do escopo. A implementação foi feita com apoio de IA, e os registros completos das sessões estão em [`prompts/sessoes/`](prompts/sessoes/).

| Ferramenta                     | Modelo                                | Uso                                                                                                                              |
| ------------------------------ | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code (extensão VS Code) | Claude Opus 5.5 (`claude-opus-5-5`)   | AP1: análise do projeto antigo, design, specs e implementação                                                                    |
| ChatGPT                        | GPT-6                                 | AP1: imagem da página inicial                                                                                                    |
| Antigravity                    | Gemini 3.8 Flash (`gemini-3-8-flash`) | AP2: primeira versão das regras e portões de qualidade (`AGENTS.md`)                                                             |
| Claude Code (extensão VS Code) | Claude Opus 5.5 (`claude-opus-5-5`)   | AP2: deploy, specs e implementação; na reta final, uma sessão orquestrou subagentes, um por branch, cada um num worktree próprio |
| Não registrada no trailer      | GPT-6 (`Agent: GPT-6`)                | AP2: acompanhamento de séries (PR #46, Lucas)                                                                                    |

Na AP2, cada commit diz no trailer `Agent:` qual ferramenta gerou o código e no `Spec:` qual spec ele implementa. Os tokens de cada sessão estão em [`prompts/custos.md`](prompts/custos.md) (somados com `scripts/custo-sessao.mjs`, que inclui os subagentes).

| Spec                                                                                       | Componente                                           |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| [`2026-10-02-fundacao`](SPEC/2026-10-02-fundacao.md)                                       | Base do projeto, CI, layout e atribuições            |
| [`2026-10-02-auth`](SPEC/2026-10-02-auth.md)                                               | Cadastro, login, logout e proteção de rotas          |
| [`2026-10-05-onboarding-preferencias`](SPEC/2026-10-05-onboarding-preferencias.md)         | Primeira versão do passo a passo de preferências     |
| [`2026-10-05-cliente-tmdb`](SPEC/2026-10-05-cliente-tmdb.md)                               | Cliente server-only da API do TMDB                   |
| [`2026-10-05-motor-recomendacao`](SPEC/2026-10-05-motor-recomendacao.md)                   | Motor de recomendação por seções                     |
| [`2026-10-05-dashboard`](SPEC/2026-10-05-dashboard.md)                                     | Seções de recomendações                              |
| [`2026-10-05-detalhes-filme`](SPEC/2026-10-05-detalhes-filme.md)                           | Página do filme e onde assistir                      |
| [`2026-10-05-reacoes`](SPEC/2026-10-05-reacoes.md)                                         | "Não é pra mim", "Gostei" e "Amei"                   |
| [`2026-10-05-listas`](SPEC/2026-10-05-listas.md)                                           | "Quero assistir" e "Já assisti"                      |
| [`2026-10-05-busca`](SPEC/2026-10-05-busca.md)                                             | Busca por nome e por filtros                         |
| [`2026-10-05-perfil`](SPEC/2026-10-05-perfil.md)                                           | Edição de nome e preferências                        |
| [`2026-10-05-me-surpreenda`](SPEC/2026-10-05-me-surpreenda.md)                             | Globo "Me surpreenda"                                |
| [`2026-10-06-onboarding-assertivo`](SPEC/2026-10-06-onboarding-assertivo.md)               | Passo a passo de 7 perguntas e "Nos seus streamings" |
| [`2026-10-06-interface`](SPEC/2026-10-06-interface.md)                                     | Identidade visual e telas                            |
| [`2026-10-13-mcp`](SPEC/2026-10-13-mcp.md)                                                 | Servidor MCP e login OAuth para agentes              |
| [`2026-11-17-visao-geral-ap2`](SPEC/2026-11-17-visao-geral-ap2.md)                         | AP2: escopo, prioridades e decisões gerais           |
| [`2026-11-18-metricas`](SPEC/2026-11-18-metricas.md)                                       | AP2: eventos de uso e página `/metricas`             |
| [`2026-11-18-metricas-funil`](SPEC/2026-11-18-metricas-funil.md)                           | AP2: funil do wizard e detalhes no `/metricas`       |
| [`2026-11-18-wizard-noite`](SPEC/2026-11-18-wizard-noite.md)                               | AP2: wizard "O que ver hoje?" e mapeamento           |
| [`2026-11-18-como-foi`](SPEC/2026-11-18-como-foi.md)                                       | AP2: "Vou ver esse!" e "Como foi?"                   |
| [`2026-11-18-noite-ate-que-horas`](SPEC/2026-11-18-noite-ate-que-horas.md)                 | AP2: "Até que horas?" no resultado                   |
| [`2026-11-18-noite-compartilhar`](SPEC/2026-11-18-noite-compartilhar.md)                   | AP2: compartilhar a noite escolhida                  |
| [`2026-11-18-series-base`](SPEC/2026-11-18-series-base.md)                                 | AP2: tipo filme/série no banco e cliente TMDB de TV  |
| [`2026-11-18-series-pagina`](SPEC/2026-11-18-series-pagina.md)                             | AP2: página da série, reações e listas de séries     |
| [`2026-11-18-series-noite`](SPEC/2026-11-18-series-noite.md)                               | AP2: séries no wizard e no "Como foi?"               |
| [`2026-11-18-noite-a-dois`](SPEC/2026-11-18-noite-a-dois.md)                               | AP2: "Noite a dois", sala para escolher juntos       |
| [`2026-11-19-noite-tempo-disponivel`](SPEC/2026-11-19-noite-tempo-disponivel.md)           | AP2: "Até que horas?" relativo e com horário livre   |
| [`2026-11-19-series-descoberta`](SPEC/2026-11-19-series-descoberta.md)                     | AP2: séries no início, na busca e episódios          |
| [`2026-11-20-acessibilidade-wizard-noite`](SPEC/2026-11-20-acessibilidade-wizard-noite.md) | AP2: acessibilidade do wizard da noite               |
| [`2026-11-23-filtro-conteudo`](SPEC/2026-11-23-filtro-conteudo.md)                         | AP2: filtro de conteúdo sensível (substituída)       |
| [`2026-11-23-filtro-idade`](SPEC/2026-11-23-filtro-idade.md)                               | AP2: filtro por idade e selo da classificação        |
| [`2026-11-23-navegacao-rapida`](SPEC/2026-11-23-navegacao-rapida.md)                       | AP2: esqueletos e sessão sem ida ao Auth             |
| [`2026-11-24-aviso-episodio-novo`](SPEC/2026-11-24-aviso-episodio-novo.md)                 | AP2: acompanhar séries e aviso de episódio novo      |

### Estrutura

```
SPEC/             specs datadas, uma por componente
prompts/sessoes/  registros das sessões com IA
src/app/          rotas (App Router)
src/components/   componentes de interface e layout
src/features/     um módulo por domínio (auth, preferências, recomendação, ...)
src/lib/          env e clientes do Supabase e do TMDB
supabase/         config e migrations do banco
tests/            unit/ e integration/ (Vitest), e2e/ (Playwright)
```

## Créditos

This product uses the TMDB API but is not endorsed or certified by TMDB. Os dados de onde assistir são fornecidos pela [JustWatch](https://www.justwatch.com/). A imagem da página inicial foi gerada por IA com o GPT-6 (OpenAI).
