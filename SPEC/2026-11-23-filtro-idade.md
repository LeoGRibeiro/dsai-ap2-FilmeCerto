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

- **Aviso:** o título aparece normalmente em todo o app, com fotos e trailer. A página dele mostra uma faixa no topo: "Não recomendado para menores de 14 anos" ou, sem classificação, "Este título não tem classificação indicativa".
- **Bloqueio total (+18):** com qualquer opção ligada, o título não aparece em nenhuma lista, busca ou recomendação, e nenhuma imagem dele é enviada ao navegador. O link direto para a página (do filme, da série ou de uma temporada) mostra só "Este título não está disponível com o filtro desta conta", **sem o nome nem o pôster**, e o título da aba também não diz qual é.

## Por quê

- **O cliente pediu:** quem tem 10 anos pode ver a página de um título de 12 a 16 anos, com um aviso de que não é recomendado, mas tudo o que é +18 tem que ser bloqueado de vez: fora das pesquisas, sem fotos e sem funcionar nem pelo link direto. Pediu também a classificação na página, ao lado da nota, para todo mundo.
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
| Tirar o +18 das listas | `semBloqueados(itens, filtro, classificar)`: sem filtro, devolve os itens sem chamar o TMDB. Com filtro, consulta no máximo 8 títulos ao mesmo tempo e tira o `18`. **Se a consulta falhar, o título sai** (na dúvida, não aparece) |
| Descoberta de filmes | Com filtro, as consultas ao `/discover/movie` (motor, "Me surpreenda", busca por filtros, wizard e noite a dois) levam `classificacaoMax: "16"`, que o TMDB já aplica. Esse filtro do TMDB só conhece a classificação do Brasil, então essas listas também perdem os títulos sem ela. Eles continuam na busca por nome e no link direto |
| Onde passa por `semBloqueados` | Parecidos do motor (`recomendacoesDe`) e da página do filme, "Séries para hoje à noite", busca por nome (filmes e séries) e as duas abas de listas. A contagem das abas conta só o que aparece. Nada é apagado: quem desligar o filtro vê tudo de volta |
| Wizard | "Família com crianças" continua com o limite 12. Com filtro e sem "Família", o limite é 16: `classificacaoMax` para filme e conferência nos detalhes para série, como a família já faz |
| Noite a dois | A função nova `filtro_na_sala_noite(p_sala)` (`security definer`) diz só se **algum** dos dois participantes tem filtro, sem dizer qual. Se tiver, o resultado da sala usa o limite 16. Quem não participa da sala recebe `false` |
| "Como foi?" | Se o título escolhido for +18 e a conta tiver filtro, a pergunta não aparece |
| Página bloqueada | Conferida no servidor, antes de montar qualquer coisa: o `generateMetadata` e a página leem a mesma busca. A resposta não traz nome, pôster, fundo, trailer, elenco nem parecidos. Status 200 com a tela de bloqueio, para não parecer erro do app |
| Selo | Componente `SeloClassificacao`, com as cores da classificação indicativa (Livre verde, 10 azul, 12 amarelo, 14 laranja, 16 vermelho, 18 preto) e o texto "Classificação: 14 anos" para leitores de tela. Na série, substitui o "12 anos" em texto da linha de dados. Sem classificação, nada aparece |
| Formulário | Quatro opções num `radiogroup`, cada uma com uma linha explicando o efeito, e "Salvar". Funciona sem JavaScript, como os outros formulários do perfil |
| Revalidação | Salvar revalida `/perfil`, `/dashboard`, `/busca`, `/listas` e o layout de `/filme` e `/serie` |
| Eventos | Nenhum evento novo. A opção escolhida diz algo sobre quem usa a conta e não entra em `eventos` |

## Código

```
supabase/migrations/<timestamp>_filtro_idade.sql   ajuste da tabela e filtro_na_sala_noite
src/lib/tmdb/classificacao.ts      conversões BR, MPA e TV (puras)
src/lib/tmdb/filmes.ts, series.ts  classificação nos detalhes; classificacaoFilme/Serie
src/features/filtro-conteudo/
  opcoes.ts        LIMITES, OPCOES (rótulo e descrição), LIMITE_COM_FILTRO = "16"
  regras.ts        tratamento, limiteMaisRestrito
  consultas.ts     obterFiltro()
  aplicar.ts       semBloqueados
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
4. **`semBloqueados`** (unitário com classificador falso): sem filtro, nenhuma chamada; com filtro, tira o 18 e mantém o sem classificação; uma consulta que falha tira o título; nunca mais de 8 consultas ao mesmo tempo.
5. **Banco** (`tests/integration/filtro-conteudo/`): a pessoa grava, lê, muda e apaga só o próprio filtro; o `check` recusa `16` e outros valores; `filtro_na_sala_noite` é `true` quando qualquer participante tem filtro, `false` sem filtro e `false` para quem não está na sala.
6. **Formulário e action** (unitários): as quatro opções com a atual marcada; "Sem filtro" apaga a linha; as outras gravam o limite; valor inválido é recusado com mensagem em pt-BR.
7. **Páginas** (unitários dos componentes): o selo mostra a classificação e o texto para leitor de tela; a faixa de aviso aparece para quem está acima do limite e para quem não tem classificação; a tela de bloqueio não tem o nome nem imagem.
8. **Integração nas telas** (unitários das funções de cada tela): motor, "Me surpreenda", wizard e noite a dois pedem `classificacaoMax: "16"` com filtro e não pedem sem ele; parecidos, busca, séries do dashboard e listas tiram o 18.
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
