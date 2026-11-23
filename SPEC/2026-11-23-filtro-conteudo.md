# Spec: Filtro de conteúdo sensível

- **Data:** 2026-11-23
- **Componente:** filtro-conteudo (perfil, recomendações, busca, listas e páginas de filme e série)
- **Status:** aprovada para implementação, com pergunta ao cliente na issue #38
- **Substitui:** nenhuma. **Amplia** o escopo da [visão geral](2026-11-17-visao-geral-ap2.md): a funcionalidade não está no pedido do cliente
- **Issue:** #38

## O quê

No `/perfil`, uma seção nova, **"Conteúdo sensível"**, liga um filtro pela classificação indicativa. Ele tem duas escolhas:

1. **Limite:** a classificação mais alta que a conta vê normalmente (**Livre**, **10**, **12**, **14** ou **16** anos). A pessoa escolhe o limite direto ou responde **"Quem usa esta conta?"** com uma faixa de idade, que só preenche o limite e o tratamento sugeridos. **A idade não é guardada.**
2. **Tratamento** do que passa do limite:
   - **Avisar:** o título aparece com as imagens borradas e o selo da classificação ("16"). Um toque em "Mostrar" revela.
   - **Ocultar:** o título some das recomendações (dashboard, wizard, "Me surpreenda", "Noite a dois" e parecidos). Na busca e nas listas, aparece borrado. A página do título abre com um aviso antes do conteúdo.
   - **Bloquear:** o título some também da busca, e a página dele fica bloqueada. Nas listas da própria pessoa, aparece borrado e não dá para revelar.

O filtro nasce **desligado** para todo mundo. Desligado, o app se comporta exatamente como hoje.

## Por quê

- [Pedido do cliente, seção 3.2](../docs/ap2/pedido-do-cliente.md#32-wizard-o-que-ver-hoje-a-principal), "Regras de recomendação": *"Família com crianças precisa respeitar a classificação etária"*. Hoje isso só vale dentro do wizard e só quando a resposta é "Família com crianças". Uma conta usada por um adolescente, ou um celular passado para uma criança, recebe qualquer título no dashboard, no "Me surpreenda" e na busca, com pôster, fundo e miniatura do trailer.
- [Seção 1](../docs/ap2/pedido-do-cliente.md#1-a-visão-o-norte-de-qualquer-mudança), o filtro **"Ajuda a decidir mais rápido?"**: um título que passa do limite seria recusado de qualquer jeito. Tirá-lo da frente economiza trocas no wizard ("Esse não") e rolagem no dashboard, sem mostrar um filme a mais.
- [Seção 1](../docs/ap2/pedido-do-cliente.md#o-que-não-queremos), "O que não queremos": *"Respostas do wizard virando preferência permanente"*. O filtro **não** sai das respostas do wizard. A pessoa o configura no perfil, de propósito. A resposta "Família com crianças" continua valendo só para aquela noite.

## Pergunta para o cliente (`pergunta-cliente`, issue #38)

O filtro de conteúdo sensível está de acordo com o "ajuda a decidir mais rápido"? Vocês preferem outros níveis ou outro padrão?

**Decisão conservadora enquanto não há resposta:**

- o filtro nasce **desligado**. Quem não mexer nele não vê nenhuma mudança, nem faz chamada a mais ao TMDB;
- ligado, um título **sem classificação conhecida conta como acima do limite** (é o mesmo critério do "Família com crianças" hoje);
- nada do filtro entra nos eventos de métricas.

Se o cliente não quiser o filtro, basta tirar a seção do `/perfil`. Sem linha na tabela, todas as telas voltam ao comportamento de hoje.

## Configuração

### "Quem usa esta conta?"

Cada faixa só preenche o formulário. A pessoa pode mudar o limite e o tratamento antes de salvar, e o banco guarda só os dois.

| Faixa              | Limite sugerido | Tratamento sugerido |
| ------------------ | --------------- | ------------------- |
| Adulto             | filtro desligado | —                  |
| 16 ou 17 anos      | 16              | Ocultar             |
| 14 ou 15 anos      | 14              | Ocultar             |
| 12 ou 13 anos      | 12              | Bloquear            |
| 10 ou 11 anos      | 10              | Bloquear            |
| Até 9 anos         | Livre           | Bloquear            |

A classificação indicativa brasileira diz "não recomendado para menores de X anos", então uma pessoa de X anos ou mais vê um título classificado como X. Por isso a faixa de 14 ou 15 anos fica com o limite 14. Não há limite 18: um limite de 18 é o mesmo que o filtro desligado.

### Tratamento por tela

"Borrado" é a imagem em baixa resolução com desfoque, o selo da classificação e o botão "Mostrar". "Borrado fixo" é a mesma coisa, sem o botão.

| Tela                                                                                      | Avisar  | Ocultar                          | Bloquear                         |
| ----------------------------------------------------------------------------------------- | ------- | -------------------------------- | -------------------------------- |
| Recomendações: seções do dashboard, "Séries para hoje à noite", wizard, "Me surpreenda", parecidos da página do filme | borrado | some                             | some                             |
| Resultado da "Noite a dois"                                                               | borrado | some (vale o limite mais restrito dos dois) | some (idem)           |
| Busca por nome (filmes e séries) e por filtros (filmes)                                   | borrado | borrado                          | some                             |
| Listas "Quero assistir" e "Já assisti"                                                    | borrado | borrado                          | borrado fixo                     |
| Página do filme, da série e da temporada                                                  | imagens borradas (pôster, fundo, miniatura do trailer, fotos dos episódios) | aviso antes do conteúdo, com "Ver mesmo assim" | bloqueada                    |

- **Página com aviso:** mostra só o título, o ano e a classificação, com "Este título é classificado para 18 anos", e os botões **"Ver mesmo assim"** e **"Voltar"**. "Ver mesmo assim" abre a página com as imagens borradas, como no Avisar.
- **Página bloqueada:** mostra só o título, a classificação e "Este título passa do limite do filtro desta conta", com o link **"Mudar o filtro no perfil"**. Não mostra sinopse, imagens, trailer, elenco, onde assistir, parecidos nem os botões de reação e lista.
- **Revelar** ("Mostrar" e "Ver mesmo assim") vale só para aquela página aberta. Nada é gravado e nenhum evento é enviado.

## De onde vem a classificação

O TMDB guarda a classificação **por país**: `release_dates` nos filmes e `content_ratings` nas séries. Muitos títulos têm a dos EUA e não têm a do Brasil. A ordem é:

1. a classificação **do Brasil** (`BR`), a primeira não vazia entre as datas de lançamento;
2. sem ela, a **dos EUA** (`US`), convertida pela tabela abaixo;
3. sem nenhuma das duas, ou se o TMDB falhar, a classificação é **desconhecida**, e com o filtro ligado o título conta como acima do limite.

### Equivalência EUA → Brasil

A conversão é conservadora: na dúvida, ela arredonda para a classificação mais alta.

| Filme (MPA) | Brasil | Série (TV Parental Guidelines) | Brasil |
| ----------- | ------ | ------------------------------ | ------ |
| G           | L      | TV-Y, TV-G                     | L      |
| PG          | 10     | TV-Y7, TV-PG                   | 10     |
| PG-13       | 14     | TV-14                          | 14     |
| R           | 18     | TV-MA                          | 18     |
| NC-17       | 18     | —                              | —      |

Valores fora da tabela (`NR`, vazio, outros países) são ignorados.

**Exceção, a descoberta de filmes:** com Ocultar ou Bloquear, as listas que vêm do `/discover/movie` usam o filtro do próprio TMDB (`certification_country=BR` e `certification.lte`), que já existe no `descobrirFilmes`. Esse filtro só conhece a classificação brasileira, então um filme que só tem a dos EUA fica de fora. Isso é mais restritivo que a tabela, e a dupla aceita a perda: em troca, essas listas não fazem nenhuma chamada a mais.

## Decisões técnicas

| Tema | Decisão |
|---|---|
| Onde fica | Tabela nova `public.filtros_conteudo`, uma linha por pessoa. **Sem linha, o filtro está desligado**, e desligar apaga a linha. Fica fora de `preferencias` porque ter uma linha lá significa "onboarding concluído", e o filtro é configurado depois, no perfil |
| Idade | Não é guardada. A faixa de "Quem usa esta conta?" só preenche o formulário no navegador, e a action recebe só `limite` e `modo` |
| Autodeclarado | O filtro é uma escolha de quem usa a conta e pode ser mudado a qualquer hora. **Não é controle parental**, e a tela não promete isso |
| Regra pura | `acimaDoLimite(classificacao, limite)`: desconhecida (`null`) é acima; senão, compara as posições em `CLASSIFICACOES_BR` (`L` < `10` < … < `18`), que já existe em `src/lib/tmdb/series.ts` e passa para `src/lib/tmdb/classificacao.ts` |
| Tratamento | `tratamento(tela, classificacao, filtro)` devolve `"normal"`, `"borrado"`, `"borrado-fixo"`, `"oculto"`, `"aviso"` ou `"bloqueado"`, conforme a tabela "Tratamento por tela". Com o filtro desligado, sempre `"normal"` |
| Classificação de cada título | `classificacaoFilme(id)` (`/movie/{id}/release_dates`) e `classificacaoSerie(id)` (`/tv/{id}/content_ratings`), no cliente TMDB existente (`criarApiClassificacao(cliente)`), com cache de 7 dias: a classificação é a mesma para todo mundo e quase nunca muda. Falha do TMDB vira `null` (o título conta como acima do limite) |
| Quantas chamadas | No máximo 8 ao mesmo tempo, e só para os títulos que vão aparecer na tela. Com o filtro desligado, **nenhuma**. Com Ocultar ou Bloquear, nenhuma nas listas de descoberta de filmes (o TMDB filtra) |
| Detalhes | `obterFilme` passa a pedir `release_dates` no `append_to_response`, e `FilmeDetalhes` ganha `classificacao: ClassificacaoBR \| null`, como `SerieDetalhes` já tem. A série passa a usar a mesma conversão EUA → Brasil |
| Wizard | Em "Família com crianças", o limite é o **menor** entre `CLASSIFICACAO_FAMILIA` (12) e o do filtro. Com Ocultar ou Bloquear e sem "Família", o limite do filtro entra nos filtros da noite do mesmo jeito: `classificacaoMax` para filme e conferência nos detalhes para série. Com Avisar, a noite não muda, e só o destaque e as opções aparecem borrados |
| Motor | `EntradaMotor` ganha `filtro`. Com Ocultar ou Bloquear, as consultas de descoberta levam `classificacaoMax`, e os parecidos (`recomendacoesDe`, que não filtra) passam pela classificação de cada título |
| Busca | Com Bloquear, os títulos acima do limite saem da página de resultados, que pode vir com menos de 20 itens. A paginação continua a do TMDB |
| Imagem borrada | Componente `ImagemSensivel`, usado nos cartões, no destaque do wizard, no globo do "Me surpreenda", no cabeçalho do filme e da série, nas fotos dos episódios e na miniatura do trailer. Borrada, ela carrega o **menor tamanho** (`w92` no pôster, `w300` no fundo e `default.jpg` no YouTube) com `blur`, então a imagem nítida só é baixada depois do "Mostrar" |
| Acessibilidade | O selo tem texto ("Classificado para 16 anos"), e o botão diz "Mostrar a imagem de {título}". O aviso e o bloqueio têm um `h1` com o título, e o foco vai para ele. Botões com pelo menos 40 px de altura, inclusive em 390 px de largura |
| Noite a dois | Ao responder, a função do banco lê o filtro **de quem responde** e grava `limite` junto com as respostas, só com Ocultar ou Bloquear. O resultado usa o menor limite entre os dois. Enquanto a sala está aberta (até 3 horas), a outra pessoa da sala consegue ler esse limite. As respostas, e o limite junto, são apagadas quando o resultado é gravado, como hoje |
| Eventos | Nenhum evento novo. O nível do filtro nunca entra em `eventos`: ele diz algo sobre quem usa a conta |
| Cache das páginas | Salvar o filtro revalida `/perfil`, `/dashboard`, `/busca`, `/listas` e o layout de `/filme` e `/serie` |

## Banco de dados

Migration nova `supabase/migrations/<timestamp>_filtros_conteudo.sql`:

- **Enum** `public.modo_filtro_conteudo` (`avisar`, `ocultar`, `bloquear`).
- **Tabela `public.filtros_conteudo`**:
  - `usuario_id uuid primary key references auth.users (id) on delete cascade`;
  - `classificacao_max text not null check (classificacao_max in ('L', '10', '12', '14', '16'))`;
  - `modo public.modo_filtro_conteudo not null`;
  - `criado_em` e `atualizado_em timestamptz not null default now()`, com o trigger `public.tocar_atualizado_em()` no update.
- Comentários na tabela e nas colunas, como na AP1.
- **RLS ligada**, para `authenticated` e sempre com `usuario_id = (select auth.uid())`: `select`, `insert`, `update` e `delete`.
- **Noite a dois:** `create or replace function public.responder_sala_noite(...)`, com a mesma assinatura e o mesmo corpo da migration `20261118233000_salas_noite`. A única mudança: quando quem chama tem filtro com `modo in ('ocultar', 'bloquear')`, `v_respostas` ganha `'limite', classificacao_max`. A função já é `security definer` e lê só a linha de `auth.uid()`. A migration antiga não é editada.
- `src/lib/supabase/database.types.ts` atualizado à mão, no formato gerado.

## Código

```
src/lib/tmdb/classificacao.ts        CLASSIFICACOES_BR, EQUIVALENCIAS_EUA, classificacaoDe(resultados, tipo) (pura),
                                     criarApiClassificacao(cliente): classificacaoFilme(id), classificacaoSerie(id)
src/lib/tmdb/esquemas.ts             release_dates do filme
src/lib/tmdb/filmes.ts               obterFilme com classificação
src/lib/tmdb/series.ts               classificação pela conversão comum
src/features/filtro-conteudo/
  opcoes.ts        LIMITES, MODOS, rótulos e FAIXAS_IDADE (tabela "Quem usa esta conta?")
  regras.ts        acimaDoLimite, tratamento, limiteMaisRestrito
  schema.ts        zod: limite um dos 5 valores, modo um dos 3, ou "desligado"
  consultas.ts     obterFiltro() (server-only, com cache() do React)
  aplicar.ts       aplicarFiltro(itens, { tipo, tela, filtro, classificar }): tira os ocultos e marca os borrados
  actions.ts       salvarFiltro(estado, formData)  ("use server")
  components/
    formulario-filtro.tsx   a seção do /perfil
    imagem-sensivel.tsx     imagem borrada, selo e "Mostrar"
    aviso-titulo.tsx        aviso e bloqueio da página do título
tests/e2e/tmdb-falso/                /movie/{id}/release_dates, /tv/{id}/content_ratings e um título 18 anos
```

`FilmeCartao` ganha `sensivel?: { classificacao: ClassificacaoBR | null; revelavel: boolean }`. Sem esse campo, o cartão fica como hoje.

## Ordem de implementação

Cada parte entrega valor sozinha, em commits de menos de 400 linhas com o teste junto. Se o tempo acabar, as partes que já entraram continuam funcionando.

1. **Base:** migration, RLS, tipos, `opcoes`, `regras` e `consultas`.
2. **TMDB:** `classificacao.ts`, a equivalência, `obterFilme` com classificação e o TMDB falso.
3. **Perfil:** formulário e action.
4. **Ocultar:** motor, "Séries para hoje à noite", "Me surpreenda", wizard (filme, série e família), parecidos e busca (Bloquear).
5. **Borrar:** `ImagemSensivel` nas telas da tabela, mais o aviso e o bloqueio nas páginas de filme, série e temporada.
6. **Noite a dois:** a função `responder_sala_noite` com o limite e o resultado com o limite mais restrito.

## Critérios de aceitação

1. **Regras** (`tests/unit/features/filtro-conteudo/regras.test.ts`): `acimaDoLimite` para cada par de classificação e limite, e `null` sempre acima; `tratamento` cobre cada célula da tabela "Tratamento por tela"; com o filtro desligado, tudo é `"normal"`; `limiteMaisRestrito` com um, dois ou nenhum limite.
2. **Classificação** (`tests/unit/lib/tmdb/classificacao.test.ts`): a do Brasil ganha da dos EUA; uma entrada BR vazia é pulada; cada linha da tabela de equivalência, para filme e série; valor desconhecido e falha do TMDB viram `null`; `obterFilme` devolve `classificacao`.
3. **Faixas** (`tests/unit/features/filtro-conteudo/formulario-filtro.test.tsx`): cada faixa preenche o limite e o tratamento da tabela; "Adulto" marca "desligado"; o formulário enviado tem só `limite` e `modo`, sem a idade.
4. **Action** (`tests/unit/features/filtro-conteudo/actions.test.ts`, com o Supabase injetado): salvar faz `upsert` de `classificacao_max` e `modo`; "desligado" apaga a linha; limite `18` ou modo inválido é recusado com mensagem em pt-BR; as rotas da tabela são revalidadas.
5. **Banco** (`tests/integration/filtro-conteudo/filtros.test.ts`): a pessoa lê, cria, muda e apaga a própria linha; outra pessoa não lê nem grava nela; o `check` recusa `18` e valores fora da lista; a linha some quando o usuário é apagado.
6. **Desligado não muda nada:** com o filtro desligado, o motor, a busca e o wizard fazem as mesmas chamadas ao TMDB de antes (cliente falso contando as chamadas) e nenhuma consulta de classificação.
7. **Ocultar** (unitários do motor, do "Me surpreenda" e do wizard): com limite 14, as consultas de descoberta levam `classificacaoMax: "14"`; um parecido classificado como 16, ou sem classificação, sai; "Família com crianças" com limite 10 usa 10, e com limite 16 usa 12; uma série 18 anos não vira a recomendação da noite.
8. **Imagem borrada** (`tests/unit/features/filtro-conteudo/imagem-sensivel.test.tsx`): borrada, a imagem pedida é a `w92` e a nítida não aparece no DOM; "Mostrar" troca pela nítida; "borrado fixo" não tem botão; o selo diz a classificação.
9. **Página do título** (unitários do aviso e do bloqueio): o aviso mostra título e classificação, e "Ver mesmo assim" revela o conteúdo com as imagens borradas; a página bloqueada não tem sinopse, trailer, onde assistir, parecidos nem botões de reação e lista.
10. **Noite a dois** (`tests/integration/noite-a-dois/salas.test.ts`): `responder_sala_noite` grava o `limite` de quem chama quando o filtro é Ocultar ou Bloquear, e não grava nada com Avisar ou sem filtro; o resultado da sala respeita o menor limite (unitário de `recomendarJuntos`, em `src/features/noite/recomendar.ts`).
11. **E2E** (`tests/e2e/filtro-conteudo.spec.ts`, em 390x844): no `/perfil`, "14 ou 15 anos" e salvar; o título 18 anos do TMDB falso some do dashboard; na busca, ele aparece borrado; a página dele abre com o aviso; com Bloquear, ele some da busca e a página fica bloqueada; com o filtro desligado, tudo volta.
12. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` e `pnpm check:secrets` sem erros, e o CI verde.

## Fora do escopo

| Item | Por quê |
|---|---|
| Senha ou PIN para mudar o filtro, contas de criança separadas | seria controle parental, que pede verificação de quem é o responsável. O filtro é autodeclarado |
| Guardar a idade ou a data de nascimento | é dado pessoal, e o limite basta. A faixa só preenche o formulário |
| Filtro por tema (violência, sexo, drogas) ou por palavra-chave | o TMDB não traz os descritores da classificação brasileira. Gêneros que a pessoa não quer ver já estão nos "gêneros evitados" |
| Configurar o filtro no onboarding e filtrar a grade de filmes do onboarding | um passo a mais no onboarding. O filtro fica no perfil |
| Servidor MCP | fora do escopo da AP2 (pedido, seção 2) |
| Contar quantas contas usam cada nível no `/metricas` | o nível diz algo sobre quem usa a conta. Sem evento, como decidido acima |
| Borrar as fotos do elenco | são fotos de pessoas, não cenas do título |
| Esconder a imagem de quem inspeciona a página | o desfoque é visual. A imagem pequena continua pública no CDN do TMDB |
