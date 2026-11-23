# Spec: Navegação rápida na área logada

- **Data:** 2026-11-23
- **Componente:** navegacao (proxy, sessão, layouts e `loading.tsx` de `(app)`)
- **Status:** aprovada para implementação
- **Substitui:** nenhuma
- **Issue:** #42

## O quê

Fazer cada clique na área logada trocar a tela na hora e encurtar o tempo que o servidor leva para montar cada página:

1. **Esqueleto imediato.** Toda rota de `(app)` passa a ter um `loading.tsx`, com um esqueleto no formato da tela de destino. O clique troca a URL e mostra o esqueleto sem esperar o servidor; o conteúdo entra quando chega.
2. **Sessão sem ida ao Auth.** O proxy e `obterUsuarioAtual` validam o JWT com `supabase.auth.getClaims()` em vez de `getUser()`.
3. **Layout em paralelo.** O layout de `(app)` lê usuário e preferências ao mesmo tempo, em vez de um depois do outro.
4. **Busca sem recarregar.** A busca do header usa `<Form>` de `next/form`: buscar é uma navegação do cliente, não um recarregamento do documento.

## Por quê

O norte do [pedido do cliente](../docs/ap2/pedido-do-cliente.md) (seção 1) é **"ajuda a decidir mais rápido?"**, e o wizard inteiro tem que levar menos de 30 segundos (seção 3.2, "Perguntas"). Medido na produção em 23/11 (`b3987e0`), cada clique deixava a tela parada de 0,5 s a 1,8 s, sem sinal de que o clique foi recebido. Só as três respostas do wizard somavam cerca de 2,5 s de espera.

| Destino (clique pelo `<Link>`)  | Clique → tela muda |
| ------------------------------- | ------------------ |
| `/listas`                       | 507 ms             |
| `/dashboard`                    | 584 a 667 ms       |
| `/busca`                        | 719 ms             |
| `/noite`                        | 1.778 ms           |
| 1ª e 2ª respostas do wizard     | 1.204 e 808 ms     |

| Requisição RSC isolada (mediana de 4) | Tempo           |
| ------------------------------------- | --------------- |
| `/api/health` (sem proxy nem layout)  | ~185 ms         |
| `/sobre` (página sem dados)           | ~680 a 745 ms   |
| `/listas`, `/busca`, `/filme/862`     | ~450 a 540 ms   |
| `/dashboard`                          | ~760 a 870 ms   |

Causas, na ordem do impacto:

1. **Nenhuma rota de `(app)` tinha `loading.tsx`.** No Next 16 (`node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`, "Dynamic routes without `loading.tsx`"), rota dinâmica sem `loading.tsx` não é pré-carregada e a navegação espera a resposta inteira do servidor. Com ele, o layout e o esqueleto são pré-carregados e a troca é imediata.
2. **Custo fixo de ~500 ms por requisição**, visível até em `/sobre`: o proxy chama `getUser()` (ida ao servidor de Auth), o header chama `getUser()` de novo, depois lê `perfis`, e o layout de `(app)` só então lê `preferencias`. O projeto assina os JWT com chave assimétrica (ES256, em `/auth/v1/.well-known/jwks.json`), então `getClaims()` valida a assinatura localmente. A chave pública fica em cache global do `auth-js` (`GLOBAL_JWKS`) e só é buscada de novo depois do TTL.
3. **A busca do header era um `<form method="get">`**, que recarrega todo o JavaScript da página a cada busca.

A Vercel roda em `iad1` e o Supabase em `us-east-1`, então a distância entre os dois não é a causa.

## Decisões técnicas

| Tema | Decisão |
| --- | --- |
| Onde fica o `loading.tsx` | Um genérico em `src/app/(app)/loading.tsx` (cobre busca, listas, perfil, métricas e temporada) e específicos onde a tela tem forma própria: `dashboard/`, `noite/`, `filme/[id]/` e `serie/[id]/` |
| Esqueletos | Peças comuns em `src/components/layout/esqueleto.tsx` (`Bloco` e `EsqueletoPagina`), reaproveitadas por todos os `loading.tsx`. O dashboard reaproveita `EsqueletoSecoes` |
| Acessibilidade do esqueleto | `role="status"`, `aria-busy="true"` e um texto só para leitor de tela ("Carregando…"), como o `EsqueletoNoite` |
| Sessão no proxy | `updateSession` chama `getClaims()`; o usuário é `{ id: claims.sub, email: claims.email }`. O `getClaims()` continua renovando a sessão quando o token está para vencer, então os cookies seguem sendo atualizados pelo proxy |
| Sessão nas páginas | `obterUsuarioAtual` usa `getClaims()` e lê o nome em `perfis`. Continua memoizado com `cache` do React |
| Server actions | Continuam com `getUser()`: escrevem no banco, e ali vale a checagem mais forte (sessão revogada no Auth é recusada na hora) |
| Sessão revogada | Com `getClaims()`, uma sessão encerrada em outro aparelho só deixa de valer para as páginas quando o access token vence (1 h, padrão do Supabase). A RLS do banco continua exigindo um JWT válido em toda consulta, e as actions recusam na hora |
| Projeto com segredo simétrico | Se o projeto voltar para HS256, o `getClaims()` faz a ida ao Auth sozinho (igual ao `getUser()`): fica mais lento, não inseguro |
| Layout de `(app)` | `Promise.all([exigirUsuario(), obterPreferencias()])`: a consulta de preferências não depende do id (a RLS filtra pelo JWT) |
| Busca do header | `<Form action="/busca">` de `next/form`, com o mesmo campo `q`. Sem JavaScript, continua sendo um formulário GET comum |
| Pré-carregamento | Sem mudar o `prefetch` dos links: o padrão do Next, com `loading.tsx`, pré-carrega só até o esqueleto, sem rodar o TMDB das páginas |

## Banco de dados

Nenhuma mudança.

## Critérios de aceitação

1. Toda rota de `ROTAS_PROTEGIDAS` (`src/proxy.ts`) que fica em `(app)` tem um `loading.tsx` no caminho até ela. *Teste:* `tests/unit/app/loading.test.tsx` percorre as pastas de `(app)` e falha se alguma página não tiver `loading.tsx` próprio ou de uma pasta acima.
2. Cada `loading.tsx` mostra um esqueleto com `role="status"` e o texto "Carregando" para leitor de tela. *Teste:* `tests/unit/app/loading.test.tsx`.
3. O proxy reconhece o usuário pelo `getClaims()` e não chama `getUser()`. Sem claims, o usuário é `null` e o proxy manda para o login. *Teste:* `tests/unit/lib/supabase/middleware.test.ts`.
4. `obterUsuarioAtual` devolve `id`, `email` e `nome` a partir das claims e de `perfis`, sem chamar `getUser()`; sem claims, devolve `null`. *Teste:* `tests/unit/features/auth/sessao.test.ts`.
5. O layout de `(app)` começa a ler as preferências antes de o usuário terminar de carregar e manda para `/onboarding` quem não tem preferências. *Teste:* `tests/unit/app/layout-app.test.tsx`.
6. Buscar pelo header leva a `/busca?q=...` sem recarregar o documento. *Teste:* `tests/e2e/busca.spec.ts` marca o `window` antes da busca e confere que a marca continua lá depois.
7. Depois do deploy, a medição da issue #42 é refeita na produção: o clique troca a tela em menos de 100 ms quando o link já foi pré-carregado, e a requisição RSC de `/sobre` fica abaixo de 400 ms. O resultado vai num comentário da issue.

## Fora do escopo

- Cache Components / Partial Prerendering (`cacheComponents`): mudaria o modelo de renderização de todas as páginas, o que é uma refatoração ampla demais para a véspera da entrega.
- Mudar a região da Vercel ou do Supabase: os dois já estão na mesma região.
- Trocar `getUser()` por `getClaims()` nas server actions e em `/api/eventos`.
- Cachear as consultas ao TMDB além do `revalidate` que já existe.
