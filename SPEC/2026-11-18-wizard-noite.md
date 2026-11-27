# Spec: Wizard "O que ver hoje?"

- **Data:** 2026-11-18
- **Componente:** noite (wizard da noite, com trailer e "termina às")
- **Status:** aprovada para implementação
- **Substitui:** nenhuma (detalha a linha 2 da tabela de `SPEC/2026-11-17-visao-geral-ap2.md`)
- **Depende de:** [2026-11-18-metricas.md](2026-11-18-metricas.md) (registro de eventos e contagem de climas)

## O quê

Um botão de destaque no dashboard, **"O que ver hoje?"**, abre um wizard de três perguntas (humor, experiência, companhia), uma por tela, com cartões grandes e "Voltar". As respostas viram filtros do TMDB e o app devolve **um único filme** em destaque: pôster, título, ano, duração, onde assistir, trailer, um motivo ligado às respostas e **"Começando agora, termina às 23h40"**.

"Esse não" pede o porquê (Já vi / Não é o clima / Muito longo / Outro), ajusta a próxima rodada e passa a mostrar 1 destaque e 2 opções menores. Depois de 5 trocas, o app oferece refazer as perguntas. "Vou ver esse!" fecha a noite.

As respostas valem só para a sessão do wizard: ficam na URL e nunca vão para o perfil nem para o banco junto ao usuário.

## Por quê

[Pedido do cliente, seção 3.2](../docs/ap2/pedido-do-cliente.md#32-wizard-o-que-ver-hoje-a-principal), a funcionalidade principal da AP2, e [seção 3.4](../docs/ap2/pedido-do-cliente.md#34-trailer-e-termina-às-no-resultado) (trailer e "termina às"). As preferências do onboarding dizem do que a pessoa gosta em geral; o wizard ajusta a recomendação ao momento sem mexer no perfil. Passa no filtro do cliente: devolve **uma** decisão, não mais filmes.

## Mapeamento das respostas para os filtros

Esta é a tabela que o cliente pediu para revisar. Os slugs são os mesmos da spec de métricas (tabela "Climas"). Os IDs são os gêneros de filme do TMDB (`src/features/preferencias/generos.ts`).

### Experiência: define o gênero (o "tom")

Cada experiência tem até 3 tons, em ordem. A primeira rodada usa o 1º. **"Não é o clima" passa para o tom seguinte** (e volta ao 1º depois do último). Gêneros ligados por "+" são exigidos **juntos** (`with_genres` com vírgula). O nome do tom aparece no motivo.

| Experiência | Tom 1 | Tom 2 | Tom 3 | Sempre exclui |
|---|---|---|---|---|
| `rir` | comédia leve: Comédia 35 | comédia romântica: Comédia 35 + Romance 10749 | comédia de aventura: Comédia 35 + Aventura 12 | Terror 27, Thriller 53, Crime 80, Guerra 10752 |
| `emocionar` | drama: Drama 18 | romance: Romance 10749 + Drama 18 | drama de época: Drama 18 + História 36 | |
| `susto` | terror: Terror 27 | terror de mistério: Terror 27 + Mistério 9648 | terror de ficção científica: Terror 27 + Ficção científica 878 | |
| `tenso` | suspense: Thriller 53 | policial: Crime 80 + Thriller 53 | mistério: Mistério 9648 | |
| `pensar` | ficção científica: Ficção científica 878 | mistério: Mistério 9648 + Drama 18 | drama para refletir: Drama 18 | |
| `distrair` | aventura: Aventura 12 | ação: Ação 28 | animação: Animação 16 | Terror 27, Guerra 10752 |

### Humor: ajusta duração, época e exclusões

| Humor | Ajuste |
|---|---|
| `cansado` | duração ≤ 110 min; ordena por popularidade (o conhecido cansa menos) |
| `animado` | nenhum |
| `pra-baixo` | exclui Terror 27, Thriller 53 e Guerra 10752 |
| `nostalgico` | lançado até 31/12/2005 (`primary_release_date.lte`) |
| `ansioso` | exclui Terror 27, Thriller 53 e Guerra 10752 |
| `de-boa` | nenhum |

### Companhia: classificação e ordem

| Companhia | Ajuste |
|---|---|
| `sozinho` | nenhum |
| `a-dois` | nenhum |
| `familia` | classificação indicativa brasileira **até 12 anos** (`certification_country=BR` + `certification.lte=12`). Filme sem classificação BR não entra |
| `amigos` | ordena por popularidade |

### Regras fixas e precedência

| Regra | Decisão |
|---|---|
| Piso de qualidade | nota ≥ 6,5 e pelo menos 300 votos, sempre |
| Ordem | por nota (`vote_average.desc`), salvo `cansado` ou `amigos`, que ordenam por popularidade |
| A experiência manda mais que o humor | uma exclusão do humor nunca tira um gênero do tom atual. Ex.: `pra-baixo` + `tenso` não exclui Thriller |
| A experiência manda mais que os favoritos | os gêneros favoritos do perfil **não entram** nos filtros. Quem ama terror mas quer rir recebe comédia |
| Gêneros evitados são absolutos | entram sempre em `without_genres` e ainda são conferidos no resultado. Um tom que exige um gênero evitado é pulado. Se todos os tons da experiência forem evitados, não há recomendação e a tela oferece refazer as perguntas |
| "Muito longo" | a próxima rodada limita a duração a 20 min a menos que a do filme recusado, nunca abaixo de 80 min. Sem duração conhecida, tira 20 min do limite atual (ou de 120). Vale junto com o limite do `cansado`: fica o menor. É uma promessa, então a duração também é conferida nos detalhes do TMDB (`obterFilme`), como no "Até que horas?": o filtro `with_runtime.lte` do `/discover` não bate com a duração dos detalhes, e filme sem duração conhecida não entra (#49) |
| "Já vi" e "Outro" | só tiram os filmes mostrados das próximas rodadas. "Já vi" oferece marcar "Já assisti" (action de `src/features/listas/`) |
| Nunca recomendar | o que está em "Já assisti", filmes com qualquer reação (quem reagiu já viu; inclui "Não é pra mim") e o que já foi mostrado nesta sessão do wizard. A lista "Quero assistir" **não** é excluída: um filme de lá que combina com a noite é uma boa sugestão |
| Streamings | primeiro busca só nos streamings da pessoa (assinatura, Brasil). Se faltar filme, completa com a busca sem filtro de provedor |
| Classificação da família | **12 anos** é a proposta da issue #2, ainda sem resposta dos clientes. É uma constante (`CLASSIFICACAO_FAMILIA`); se o cliente pedir outro limite, muda só ela |

## Motivo exibido

`motivoDaNoite` monta a frase a partir das respostas, do tom e do filme:

> "Você está **cansado**, quer **rir** e vai ver **a dois**: **comédia leve**, nota **7,8**, **está na Netflix**."

| Pergunta | Trecho |
|---|---|
| humor | "Você está cansado / animado / pra baixo / nostálgico / ansioso / de boa" |
| experiência | "quer rir / quer se emocionar / quer levar um susto / quer ficar tenso / quer pensar / quer só se distrair" |
| companhia | "vai ver sozinho / vai ver a dois / vai ver com as crianças / vai ver com os amigos" |
| onde | "está na Netflix" (artigo certo para cada streaming da lista do onboarding, "em X" para os demais), dando preferência aos streamings da pessoa; "não está nos seus streamings" quando não há assinatura no Brasil |

A nota sai com uma casa decimal e vírgula. O motivo nunca cita gênero favorito, só o tom.

## Decisões técnicas

| Tema | Decisão |
|---|---|
| Onde fica | `src/features/noite/`, com a lógica pura separada das consultas e da action, como na AP1 |
| Estado | Só na URL de `/noite`: `humor`, `exp`, `com` (respostas), `tom` (0 a 2), `max` (limite de duração do "Muito longo"), `vistos` (IDs já mostrados, até 50) e `trocas` (0 a 5). Valor inválido é ignorado. "Voltar" é o histórico do navegador |
| Telas pela URL | `/noite` pergunta o humor; com `humor`, pergunta a experiência; com `exp`, a companhia; com as três, mostra o resultado. Cada cartão é um link: dashboard (1) + 3 respostas = **4 cliques** |
| Rodadas | `proximaRodada(estado, motivo, mostrados)` devolve o estado da próxima troca: soma os mostrados a `vistos`, aplica o motivo e incrementa `trocas`. No limite (5), devolve `null` e a tela troca "Esse não" por "Refazer as perguntas" |
| Quantidade | Rodada 0: 1 filme. Depois de uma troca: 1 destaque + 2 opções. Busca até 2 páginas por consulta para completar |
| Detalhes | Cada filme mostrado passa por `obterFilme` (duração, trailer, onde assistir; cache de 24 h) |
| Cliente TMDB | `FiltrosDescoberta` ganha `todosGeneros` (AND, tem precedência sobre `generos`), `classificacaoMax` (`certification_country=BR` + `certification.lte`) e `lancadoAte` (`primary_release_date.lte`). Nenhum cliente novo |
| "Termina às" | `terminaAs(inicio, duracaoMin)` devolve "23h40" no fuso do navegador. É chamado **no componente do navegador**, nunca no servidor (que roda em UTC) |
| Trailer | O componente `Trailer` da AP1, com `origem="noite"` |
| Determinismo | Sem sorteio: a mesma URL dá o mesmo resultado (recarregar a página não troca o filme). A variedade vem de `vistos` e do `tom` |
| Erros do TMDB | Uma consulta que falha vira lista vazia com log, como no "Me surpreenda": se a outra consulta traz filmes, a rodada segue. Se alguma consulta falhou **e** nenhum filme sobrou, `recomendarNoite` lança, e a página mostra o erro amigável (`error.tsx`) com "Tentar de novo", porque refazer as perguntas não resolveria. Sem filme e sem falha, a tela diz "Não achamos nada para essa noite" e oferece refazer as perguntas |

### Telas

| Tema | Decisão |
|---|---|
| Rota | `src/app/(app)/noite/page.tsx` com `exigirUsuario` e preferências (sem elas, `/onboarding`). Um `layout.tsx` próprio guarda a sessão do wizard no navegador, porque ele não é remontado entre as telas (só a página muda com a URL) |
| Perguntas | Título da pergunta, "1 de 3" e um cartão grande por resposta (rótulos de `ROTULOS_CLIMA`), cada um um `Link` para `urlComResposta(...)`. Em 390 px, duas colunas. "Voltar" usa `router.back()`; sem histórico (a pessoa abriu `/noite` direto), vai para o dashboard |
| Botão no dashboard | "O que ver hoje?", link de destaque no topo do dashboard |
| Destaque | Pôster, título, ano, `formatarDuracao`, sinopse curta (3 linhas), motivo, streaming (`provedor`), "Começando agora, termina às 23h40" (só no navegador, atualizado a cada 30 s) e o `Trailer` |
| Carregamento | O resultado fica num `Suspense` com esqueleto ("Procurando o filme da sua noite…"); as perguntas não esperam o TMDB |
| "Esse não" | Abre a escolha do motivo (rótulos em `ROTULOS_MOTIVO`). As URLs das próximas rodadas são calculadas no servidor com `proximaRodada` e `urlDaNoite`, uma por motivo; o navegador só envia `wizard_troca` e navega. "Trocas restantes: N" fica ao lado do botão |
| "Já vi" | Pergunta se a pessoa quer marcar o **destaque** como "Já assisti" (`alternarLista`) antes de trocar: "Marcar e trocar" ou "Só trocar" |
| Limite | Na 5ª troca, "Esse não" dá lugar a "Você chegou ao limite de trocas" e ao link "Refazer as perguntas" (`/noite`) |
| "Vou ver esse!" | O `VouVerEsse` do "Como foi?" no destaque e em cada opção. Depois da escolha, somem "Esse não" e os botões das outras opções |

### Eventos (spec de métricas)

| Evento | Onde é emitido |
|---|---|
| `wizard_iniciado` | navegador, ao abrir `/noite` sem respostas. Conta uma vez por rodada de perguntas: voltar à 1ª pergunta sem ter chegado ao resultado não conta de novo; "Refazer as perguntas" depois do resultado conta |
| `wizard_concluido` | servidor, pela action `concluirNoite(respostas)`, chamada uma vez pelo navegador ao mostrar a primeira recomendação (`trocas = 0`). Voltar no histórico até essa tela não chama de novo. A mesma action chama `registrarClima` com as três respostas, que só ficam na contagem anônima |
| `wizard_troca` | navegador, ao escolher o motivo de "Esse não" |
| `wizard_escolheu` | navegador, em "Vou ver esse!", com `trocas` |
| `wizard_abandonado` | navegador, sem escolha, no `pagehide` (fechar a aba, sair do site) **ou** ao sair de `/noite` pelo próprio app (o layout do wizard é desmontado), com a etapa (`perguntas` ou `resultado`). Uma vez por sessão do wizard |
| `trailer_aberto` | `Trailer` com `origem="noite"` |

Os slugs de motivo da troca já estão em `MOTIVOS_TROCA` (`src/features/metricas/eventos.ts`). Esta spec não muda a lista de eventos.

## Banco de dados

Nenhuma mudança. As respostas não são gravadas; a contagem de climas usa `registrar_clima`, da spec de métricas. A escolha da noite ("Vou ver esse!") passa a ser gravada na spec do "Como foi?" (#7).

## Código

```
src/lib/tmdb/tipos.ts, filmes.ts    todosGeneros, classificacaoMax, lancadoAte
src/features/noite/
  opcoes.ts        perguntas, rótulos dos cartões e trechos do motivo (slugs de CLIMAS)
  mapeamento.ts    as tabelas desta spec, em constantes
  filtros.ts       filtrosDaNoite(estado, perfil): filtros do TMDB e tom, ou null
  estado.ts        lerEstado(searchParams), urlDaNoite(estado), proximaRodada(...)
  motivo.ts        motivoDaNoite(respostas, tom, filme, streamings) e provedorDaNoite
  termina.ts       terminaAs(inicio, duracaoMin)
  recomendar.ts    recomendarNoite({ estado, perfil, excluir, api })  (API injetável)
  consultas.ts     obterNoite(estado, preferencias): exclusões do banco + recomendarNoite  (server-only)
  actions.ts       concluirNoite(respostas): wizard_concluido + registrarClima
  components/
    pergunta-noite.tsx      cartões de uma pergunta, com "Voltar" (botao-voltar.tsx)
    botao-noite.tsx         "O que ver hoje?" do dashboard
    sessao-noite.tsx        contexto do layout: wizard_iniciado, wizard_abandonado, concluir uma vez
    recomendacao-noite.tsx  servidor: obterNoite + URLs das próximas rodadas
    resultado-noite.tsx     destaque, opções, "Vou ver esse!" e "Esse não"
    filme-destaque.tsx, opcao-noite.tsx, termina-as.tsx, esse-nao.tsx, sem-noite.tsx
src/app/(app)/noite/      layout.tsx (sessão), page.tsx (rota) e error.tsx ("Tentar de novo")
```

- `/noite` entra em `ROTAS_PROTEGIDAS` do `proxy.ts`. Sem preferências, redireciona para `/onboarding`, como o dashboard.
- O TMDB falso dos E2E responde à classificação: com `certification.lte`, devolve filmes "Para a família", e os detalhes desses IDs (`/movie/{id}`, que o resultado usa) também trazem o título "Para a família".

## Critérios de aceitação

1. **TMDB** (`tests/unit/lib/tmdb/filmes.test.ts`): `todosGeneros` vira `with_genres` com vírgula e tem precedência sobre `generos`; `classificacaoMax` envia `certification_country=BR` e `certification.lte`; `lancadoAte` envia `primary_release_date.lte`.
2. **Mapeamento e filtros** (`tests/unit/features/noite/`), com testes de tabela:
   1. cada experiência gera os gêneros do tom 1, e `tom` 1 e 2 geram os tons seguintes, voltando ao 1º;
   2. `cansado` limita a 110 min e ordena por popularidade; `nostalgico` filtra até 2005; `pra-baixo` e `ansioso` excluem Terror, Thriller e Guerra, **menos** o gênero do tom (`tenso` mantém Thriller);
   3. `familia` envia classificação até 12; `amigos` ordena por popularidade;
   4. o piso (6,5 e 300 votos) está sempre presente, e os gêneros favoritos nunca entram;
   5. os gêneros evitados estão sempre em `semGeneros`; um tom com gênero evitado é pulado; com todos evitados, o resultado é `null`;
   6. o limite do "Muito longo" e o do `cansado` se combinam pelo menor.
3. **Estado**: `lerEstado` aceita os slugs e números válidos e ignora o resto (slug desconhecido, `trocas` acima de 5, IDs não inteiros); `urlDaNoite` faz o caminho inverso; `proximaRodada` soma os mostrados a `vistos`, avança o tom em "Não é o clima", reduz a duração em "Muito longo" (com piso de 80) e devolve `null` na 6ª troca.
4. **Motivo e horário**: `motivoDaNoite` produz a frase do exemplo do cliente para cansado + rir + a dois + Netflix, usa o artigo certo, prefere o streaming da pessoa e diz "não está nos seus streamings" sem assinatura; `terminaAs` soma a duração e passa da meia-noite ("0h40").
5. **Recomendação** (`recomendarNoite` com API falsa): busca primeiro nos streamings e completa sem eles; nunca devolve filme excluído, já visto ou com gênero evitado (mesmo se o TMDB devolver); devolve 1 filme na rodada 0 e 3 depois de uma troca; devolve `null` sem candidatos; segue quando só uma das consultas falha e lança quando o TMDB falha e nenhum filme sobra.
6. **Action e consultas**: `concluirNoite` registra `wizard_concluido` e a contagem de climas para o usuário logado, e nada sem sessão ou com resposta inválida; `obterNoite` exclui "Já assisti" e todas as reações, mas não "Quero assistir".
7. **Telas** (unitários dos componentes e E2E em `tests/e2e/noite.spec.ts`): do dashboard à primeira recomendação em 4 cliques; "Voltar" volta à pergunta anterior; o resultado mostra motivo, "termina às" e trailer; "Esse não" mostra 3 opções sem repetir; no limite de trocas, aparece "Refazer as perguntas"; "família" só traz filmes "Para a família"; o `/perfil` não muda depois do wizard; o fluxo funciona em 390 × 844, com os botões principais visíveis e clicáveis; sem sessão, `/noite` leva ao login.
8. **Casos ruins** (unitários): sem preferências, `/noite` redireciona para `/onboarding`; resposta inválida na URL é ignorada (volta à pergunta que falta); sem filme, "Não achamos nada para essa noite" com "Refazer as perguntas"; TMDB fora do ar, o `error.tsx` com "Tentar de novo".
9. **Eventos** (unitários da sessão do wizard): `wizard_iniciado` uma vez por rodada de perguntas; `wizard_concluido` uma vez por sessão; `wizard_troca` com o motivo; `wizard_abandonado` no `pagehide` e ao sair de `/noite`, com a etapa, e nunca depois de "Vou ver esse!".
10. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` e `pnpm check:secrets` sem erros, e o CI verde.

## Fora do escopo

| Item | Onde fica |
|---|---|
| Pergunta "Filme ou série?" | spec de séries (#8). Até lá, a tela não aparece |
| Gravar a escolha e perguntar "Como foi?" | spec `como-foi` (#7) |
| Palavras-chave (`with_keywords`) para o tom | não planejado: os pares de gêneros já diferenciam os tons, e as palavras-chave do TMDB são irregulares em português |
| Sorteio entre os melhores resultados | não planejado: a página deve dar o mesmo filme para a mesma URL |
| "Noite a dois" | #9, depois |
