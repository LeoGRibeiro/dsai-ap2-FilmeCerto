# Spec: Filtro por idade e classificação indicativa

- **Data:** 2026-11-23
- **Componente:** filtro-conteudo (perfil, páginas de filme e série, recomendações, busca e listas)
- **Status:** aprovada para implementação
- **Substitui:** [2026-11-23-filtro-conteudo.md](2026-11-23-filtro-conteudo.md) inteira. Saem os modos "Avisar / Ocultar / Bloquear" e as imagens borradas; o filtro passa a ter um eixo só, a idade
- **Pedido:** novo pedido do cliente, feito depois das seções 3.1 a 3.6 do [pedido original](../docs/ap2/pedido-do-cliente.md), que já foram entregues
- **Issue:** #38

## O quê

1. **Selo da classificação, sempre.** As páginas de filme e de série mostram a classificação indicativa ("14") ao lado da nota, com ou sem filtro.
2. **Filtro por idade** no `/perfil`, na seção "Conteúdo sensível", com quatro opções:

| Opção | Normal | Abre com aviso | Bloqueio total |
|---|---|---|---|
| **Sem filtro** (padrão) | tudo | — | — |
| **Até 10 anos** | L, 10 | 12, 14, 16 e sem classificação | 18 |
| **Até 14 anos** | L a 14 | 16 e sem classificação | 18 |
| **Sem conteúdo +18** | L a 16 | sem classificação | 18 |

- **Aviso:** o título aparece na busca, nas listas da pessoa e pelo link direto, com fotos e trailer. A página dele mostra uma faixa no topo: "Não recomendado para menores de 14 anos" ou, sem classificação, "Este título não tem classificação indicativa".
- **Bloqueio total (+18):** com qualquer opção ligada, o título não aparece em nenhuma lista, busca ou recomendação, e nenhuma imagem dele é enviada ao navegador. O link direto para a página (do filme, da série ou de uma temporada) mostra só "Este título não está disponível com o filtro desta conta", **sem o nome nem o pôster**, e o título da aba também não diz qual é.
- **Recomendações só dentro da idade:** com filtro, o que o app sugere (as seções do dashboard, "Séries para hoje à noite", "Me surpreenda", o wizard, a noite a dois e os parecidos na página do filme) não traz título com classificação **acima do limite**. Com "Até 10 anos", só L e 10; com "Até 14 anos", de L a 14; com "Sem conteúdo +18", de L a 16. O título sem classificação continua aparecendo onde a fonte o traz (veja "Descoberta de filmes" abaixo). O título acima do limite segue acessível pela busca e pelo link direto, com o aviso.

## Por quê

- **O cliente pediu:** quem tem 10 anos pode ver a página de um título de 12 a 16 anos, com um aviso de que não é recomendado, mas esse título não deve ser sugerido: aparece só na pesquisa ou pelo link direto (pedido de 23/11, depois da primeira versão, em que as recomendações iam até 16 com qualquer filtro), mas tudo o que é +18 tem que ser bloqueado de vez: fora das pesquisas, sem fotos e sem funcionar nem pelo link direto. Pediu também a classificação na página, ao lado da nota, para todo mundo.
- [Pedido original, seção 3.2](../docs/ap2/pedido-do-cliente.md#32-wizard-o-que-ver-hoje-a-principal): "Família com crianças" já respeita a classificação no wizard. O filtro leva a mesma ideia para a conta inteira, sem virar resposta do wizard.

## De onde vem a classificação

O TMDB guarda a classificação por país: `release_dates` nos filmes e `content_ratings` nas séries.

1. **Brasil** (`BR`). Num filme com mais de uma data de lançamento no Brasil (cinema, DVD), vale **a mais alta**.
2. Sem a do Brasil, a **dos EUA**, convertida pela tabela abaixo (também a mais alta, se houver várias).
3. Sem nenhuma das duas: **sem classificação**. Com o filtro ligado, isso dá aviso, **nunca bloqueio**.

| Filme (MPA) | Brasil | Série (TV Parental Guidelines) | Brasil |
|---|---|---|---|
| G | L | TV-Y, TV-G | L |
| PG | 10 | TV-Y7, TV-PG | 10 |
| PG-13 | 14 | TV-14 | 14 |
| R | 16 | TV-MA | 16 |
| NC-17 | 18 | — | — |

Uma classificação deduzida dos EUA só bloqueia com NC-17. R e TV-MA viram 16 (aviso), porque muitos desses títulos são 16 no Brasil, e bloquear de vez por uma conversão aproximada esconderia o que não precisa. Valores fora da tabela (`NR`, vazio) são ignorados.

## Decisões técnicas

| Tema | Decisão |
|---|---|
| Banco | A tabela `filtros_conteudo` da spec anterior, ajustada numa **migration nova** (a anterior não é editada): sai a coluna `modo` e o enum `modo_filtro_conteudo`; `classificacao_max` vira `limite`, com `check (limite in ('10', '14', '18'))`. Sem linha, "Sem filtro" |
| Idade | Não é guardada. O banco guarda só a opção escolhida |
| Regra | `tratamento(classificacao, limite)`: sem filtro, `normal`; `18`, `bloqueado`; sem classificação ou acima do limite, `aviso`; senão, `normal`. Com "Sem conteúdo +18", o limite é 18, então de L a 16 é normal |
| Classificação nos detalhes | `obterFilme` passa a pedir `release_dates` no `append_to_response`, e `FilmeDetalhes` ganha `classificacao`. A série usa a mesma conversão. A conversão é pura, em `src/lib/tmdb/classificacao.ts` |
| Classificação de um título só | `classificacaoFilme(id)` (`/movie/{id}/release_dates`) e `classificacaoSerie(id)` (`/tv/{id}/content_ratings`), com cache de 7 dias: a classificação é a mesma para todo mundo |
| Tirar títulos de uma lista | `semBloqueados(itens, filtro, classificar)` tira o `18`; `soRecomendaveis(itens, filtro, classificar)` tira o que passa do limite das recomendações (o 18 inclusive) e mantém o sem classificação. Os dois: sem filtro, devolvem os itens sem chamar o TMDB; com filtro, consultam no máximo 8 títulos ao mesmo tempo. **Se a consulta falhar, o título sai** (na dúvida, não aparece) |
| Limite das recomendações | `limiteDasRecomendacoes(filtro)`: o próprio limite com "Até 10" e "Até 14"; 16 com "Sem conteúdo +18"; nenhum sem filtro |
| Descoberta de filmes | Com filtro, as consultas ao `/discover/movie` do motor, do "Me surpreenda", do wizard e da noite a dois levam `classificacaoMax` igual ao limite das recomendações; a busca por filtros continua com `"16"`, porque ali o título acima da idade aparece com aviso. O TMDB aplica o limite. Esse filtro do TMDB só conhece a classificação do Brasil, então essas listas também perdem os títulos sem ela. Eles continuam na busca por nome e no link direto |
| Onde passa cada um | `soRecomendaveis`: parecidos do motor (`recomendacoesDe`) e da página do filme, e "Séries para hoje à noite". `semBloqueados`: busca por nome (filmes e séries) e as duas abas de listas. A contagem das abas conta só o que aparece. Nada é apagado: quem desligar o filtro vê tudo de volta |
| Contagem da busca por nome | O total do TMDB conta os títulos que o filtro tirou. Com filtro, se o resultado cabe numa página, o cabeçalho mostra quantos sobraram; com mais páginas, mostra "Resultados para “x”", sem número, porque o certo exigiria classificar todas as páginas. A busca por filtros mantém o total, que o TMDB já calcula com o limite |
| Wizard | Vale o menor entre o 12 de "Família com crianças" e o limite das recomendações: `classificacaoMax` para filme e conferência nos detalhes para série, como a família já faz |
| Noite a dois | A função `limite_filtro_sala_noite(p_sala)` (`security definer`, migration nova que também apaga a `filtro_na_sala_noite`, que só dizia se havia filtro) devolve o **menor** limite entre os dois participantes, ou `null` se nenhum tem filtro; quem não participa da sala recebe `null`. O resultado da sala usa o limite das recomendações desse filtro. Se a consulta falhar, vale "Até 10 anos", o mais seguro |
| "Como foi?" | Se o título escolhido for +18 e a conta tiver filtro, a pergunta não aparece |
| Página bloqueada | Conferida no servidor, antes de montar qualquer coisa: o `generateMetadata` e a página leem a mesma busca. A resposta não traz nome, pôster, fundo, trailer, elenco nem parecidos. Status 200 com a tela de bloqueio, para não parecer erro do app |
| Selo | Componente `SeloClassificacao`, com as cores da classificação indicativa (Livre verde, 10 azul, 12 amarelo, 14 laranja, 16 vermelho, 18 preto) e o texto "Classificação: 14 anos" para leitores de tela. Na série, substitui o "12 anos" em texto da linha de dados. Sem classificação, nada aparece |
| Formulário | Quatro opções num `radiogroup`, cada uma com uma linha explicando o efeito, e "Salvar". Funciona sem JavaScript, como os outros formulários do perfil |
| Revalidação | Salvar revalida `/perfil`, `/dashboard`, `/busca`, `/listas` e o layout de `/filme` e `/serie` |
| Eventos | Nenhum evento novo. A opção escolhida diz algo sobre quem usa a conta e não entra em `eventos` |

## Código

```
supabase/migrations/<timestamp>_filtro_idade.sql   ajuste da tabela e filtro_na_sala_noite
supabase/migrations/<timestamp>_limite_sala_noite.sql   limite_filtro_sala_noite
src/lib/tmdb/classificacao.ts      conversões BR, MPA e TV (puras)
src/lib/tmdb/filmes.ts, series.ts  classificação nos detalhes; classificacaoFilme/Serie
src/features/filtro-conteudo/
  opcoes.ts        LIMITES, OPCOES (rótulo e descrição), LIMITE_COM_FILTRO = "16"
  regras.ts        tratamento, limiteMaisRestrito
  consultas.ts     obterFiltro()
  aplicar.ts       semBloqueados, soRecomendaveis, descobrirComFiltro
  actions.ts       salvarFiltro
  components/
    formulario-filtro.tsx    seção do /perfil
    selo-classificacao.tsx   selo ao lado da nota
    aviso-classificacao.tsx  faixa de aviso
    titulo-bloqueado.tsx     tela do bloqueio total
```

## Critérios de aceitação

1. **Conversão** (`tests/unit/lib/tmdb/classificacao.test.ts`): a do Brasil ganha da dos EUA; com várias do Brasil, vale a mais alta; cada linha da tabela MPA e TV; `NR`, vazio e outros países viram `null`.
2. **Regra** (`tests/unit/features/filtro-conteudo/regras.test.ts`): cada célula da tabela de opções, inclusive "sem classificação" (aviso, nunca bloqueio) e "Sem filtro" (tudo normal).
3. **Detalhes**: `obterFilme` devolve a classificação; a de série usa os EUA quando falta a do Brasil.
4. **`semBloqueados` e `soRecomendaveis`** (unitário com classificador falso): sem filtro, nenhuma chamada; com filtro, `semBloqueados` tira só o 18 e `soRecomendaveis` tira o que passa do limite (com "Até 10", o 12; com "Sem conteúdo +18", o 18 e não o 16); os dois mantêm o sem classificação; uma consulta que falha tira o título; nunca mais de 8 consultas ao mesmo tempo.
5. **Banco** (`tests/integration/filtro-conteudo/`): a pessoa grava, lê, muda e apaga só o próprio filtro; o `check` recusa `16` e outros valores; `limite_filtro_sala_noite` devolve o menor limite dos dois participantes, `null` sem filtro e `null` para quem não está na sala.
6. **Formulário e action** (unitários): as quatro opções com a atual marcada; "Sem filtro" apaga a linha; as outras gravam o limite; valor inválido é recusado com mensagem em pt-BR.
7. **Páginas** (unitários dos componentes): o selo mostra a classificação e o texto para leitor de tela; a faixa de aviso aparece para quem está acima do limite e para quem não tem classificação; a tela de bloqueio não tem o nome nem imagem.
8. **Integração nas telas** (unitários das funções de cada tela): com "Até 10 anos", motor, "Me surpreenda", wizard e noite a dois pedem `classificacaoMax: "10"`, e nada sem filtro; a busca por filtros pede `"16"`; parecidos e séries do dashboard tiram o que passa do limite; busca por nome e listas tiram só o 18; com filtro, a busca por nome conta só o que aparece numa página só e não mostra número com mais páginas.
9. **E2E** (`tests/e2e/filtro-conteudo.spec.ts`, em 390x844): o selo aparece na página do filme; com "Até 10 anos", a página de um filme 14 abre com o aviso; a de um filme 18, pelo link direto, mostra o bloqueio sem o título; o filme 18 não aparece na busca; com "Sem filtro", tudo volta.
10. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` e `pnpm check:secrets` sem erros, e o CI verde.

## Fora do escopo

| Item | Por quê |
|---|---|
| Senha ou PIN para mudar o filtro | seria controle parental. O filtro é autodeclarado, e quem usa a conta pode mudá-lo no perfil |
| Guardar idade ou data de nascimento | a opção basta |
| Selo nos cartões das listas | o aviso fica na página do título, e o selo, ao lado da nota |
| Servidor MCP | fora do escopo da AP2 (pedido, seção 2) |
| Filtrar a grade de filmes do onboarding | o filtro é configurado depois, no perfil |
| Esconder as imagens no CDN do TMDB | o app não envia a imagem, mas o CDN do TMDB é público |
| Contar quantas contas usam cada opção no `/metricas` | a opção diz algo sobre quem usa a conta |
| Temas da classificação ("Temas: violência, medo", dos `descriptors` do TMDB) | chegaram a ser feitos e foram retirados em 23/11. Os temas do Brasil quase nunca vêm, e os da Holanda e da Alemanha marcam animações infantis, como Toy Story e Procurando Nemo, com "medo" e "violência". Ao lado de um selo L, isso assusta sem informar |
