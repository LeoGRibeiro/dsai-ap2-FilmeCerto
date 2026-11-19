# Spec: "Noite a dois" (escolher juntos)

- **Data:** 2026-11-18
- **Componente:** noite (sala para duas pessoas responderem o wizard, cada uma no próprio celular)
- **Status:** aprovada para implementação
- **Substitui:** nenhuma. **Amplia o escopo** de [2026-11-17-visao-geral-ap2.md](2026-11-17-visao-geral-ap2.md), que deixava a 3.6 em "Fora do escopo", e reaproveita o wizard de [2026-11-18-wizard-noite.md](2026-11-18-wizard-noite.md) e o "Vou ver esse!" de [2026-11-18-como-foi.md](2026-11-18-como-foi.md)
- **Issue:** #9

## O quê

Na primeira tela do wizard (`/noite`), um botão secundário **"Vamos escolher juntos"** cria uma **sala** e leva a `/noite/juntos/{sala}`. Ali a pessoa vê o link da sala, com **"Copiar link"** e **"Enviar no WhatsApp"**, e responde as mesmas três perguntas do wizard (humor, experiência, companhia).

Quem abre o link, logado, entra na sala como a segunda pessoa e responde no próprio celular. Quem já respondeu vê **"Esperando a outra pessoa responder…"**, e a tela se atualiza sozinha. Quando as duas respondem, o app sugere **um filme em destaque e mais duas opções** que agradam às duas, com um motivo como:

> "Um quer rir e o outro quer ficar tenso: comédia de ação, nota 7,1, está na Netflix."

As duas pessoas veem a mesma sugestão e o mesmo motivo, e cada uma pode tocar em **"Vou ver esse!"** (que alimenta o "Como foi?" de cada uma).

## Por quê

[Pedido do cliente, seção 3.6](../docs/ap2/pedido-do-cliente.md#36-noite-a-dois-para-depois): "o maior conflito da noite não é 'o que eu vejo', é 'o que a gente vê'". O próprio pedido marca a 3.6 como **"para depois"** e a visão geral a deixou fora do escopo. Com as prioridades 3.1 a 3.5 entregues ou em PR, esta spec traz a 3.6 para dentro, na versão mínima: uma sala curta, sem tempo real, que devolve **uma** decisão para as duas pessoas. Passa no filtro do cliente: resolve a discussão do sofá em vez de mostrar mais filmes.

As regras da 3.2 continuam valendo: as respostas não viram preferência ([3.2, "Nada é salvo como preferência"](../docs/ap2/pedido-do-cliente.md#32-wizard-o-que-ver-hoje-a-principal)), o perfil só é lido e o piso de qualidade e a classificação da família se mantêm.

## Combinação das respostas

As duas pessoas respondem as mesmas perguntas do wizard, com os mesmos slugs (`CLIMAS`). A combinação usa as tabelas de [2026-11-18-wizard-noite.md](2026-11-18-wizard-noite.md) e a regra geral é: **o tom vem das duas experiências, e as restrições de cada uma valem para as duas** (ninguém recebe um filme que a outra pessoa recusaria pelo humor ou pela companhia).

### Experiências: o tom da sala

| Experiências | Tom (gêneros exigidos juntos) |
|---|---|
| iguais | o tom 1 da experiência no wizard (ex.: `rir` + `rir` → comédia leve) |
| `distrair` + qualquer outra | o tom 1 **da outra** ("só me distrair" funciona como o "tanto faz": quem tem vontade definida decide) |
| `rir` + `emocionar` | comédia dramática: Comédia 35 + Drama 18 |
| `rir` + `susto` | terror com humor: Terror 27 + Comédia 35 |
| `rir` + `tenso` | comédia de ação: Comédia 35 + Ação 28 |
| `rir` + `pensar` | comédia de ficção científica: Comédia 35 + Ficção científica 878 |
| `emocionar` + `susto` | terror dramático: Terror 27 + Drama 18 |
| `emocionar` + `tenso` | drama policial: Drama 18 + Crime 80 |
| `emocionar` + `pensar` | drama de ficção científica: Drama 18 + Ficção científica 878 |
| `susto` + `tenso` | terror de suspense: Terror 27 + Thriller 53 |
| `susto` + `pensar` | terror de ficção científica: Terror 27 + Ficção científica 878 |
| `tenso` + `pensar` | suspense de mistério: Thriller 53 + Mistério 9648 |

A ordem das pessoas não importa (`tenso` + `rir` dá o mesmo que `rir` + `tenso`).

### Restrições e precedência

| Regra | Decisão |
|---|---|
| Exclusões da experiência | A união das exclusões fixas das duas experiências (`rir` exclui Terror, Thriller, Crime e Guerra; `distrair`, Terror e Guerra), **menos** os gêneros do tom. Ex.: `rir` + `susto` exclui Thriller, Crime e Guerra, mas não Terror |
| Humor | Os ajustes dos dois humores valem juntos: duração pelo **menor** limite (`cansado`: 110 min), `nostalgico` de qualquer lado limita a 2005, `pra-baixo` ou `ansioso` de qualquer lado excluem Terror, Thriller e Guerra, **menos** os gêneros do tom (a experiência manda mais que o humor, como no wizard) |
| Companhia | **Família de um lado só já vale**: classificação até 12 anos (`CLASSIFICACAO_FAMILIA`). Se as crianças estão no sofá de alguém, estão no sofá |
| Ordem | Popularidade se algum humor (`cansado`) ou companhia (`amigos`) pedir; senão, por nota |
| Piso de qualidade | O do wizard: nota ≥ 6,5 e pelo menos 300 votos |
| Gêneros evitados | A **união** dos evitados das duas pessoas, absolutos como no wizard. Se o tom da tabela tiver um gênero evitado, tenta o tom 1 da experiência de quem criou a sala e depois o da outra pessoa; se todos tiverem gênero evitado, não há sugestão e a tela diz isso |
| Nunca sugerir | O que **qualquer uma das duas** marcou como "Já assisti" ou com reação |
| Streamings | Primeiro busca nos streamings das duas (a união) e completa sem filtro de provedor, como no wizard |
| Quantidade | 1 destaque + 2 opções logo de cara. Não há "Esse não" na sala: trocar exigiria as duas concordarem de novo |

### Motivo

| Situação | Começo do motivo |
|---|---|
| Mesma experiência | "Os dois querem rir" |
| Experiências diferentes | "Um quer rir e o outro quer ficar tenso" (na ordem de quem criou a sala) |
| Família de algum lado | acrescenta " e tem criança no sofá" |

Depois vem, como no wizard: `": {tom}, nota {nota}, {onde}."` (ex.: "está na Netflix", com a preferência pelos streamings das duas pessoas). Os trechos das experiências são os mesmos do wizard (`TRECHOS.experiencia`).

## Decisões técnicas

| Tema | Decisão |
|---|---|
| Lógica pura | `src/features/noite/juntos.ts`: `tomJuntos(a, b, evitados)`, `filtrosJuntos(a, b, evitados)` e `motivoJuntos(a, b, tom, filme, provedor)`. As tabelas desta spec ficam em constantes |
| Reaproveitamento | `filtros.ts` ganha `montarFiltros` (os ajustes de humor e companhia para uma lista de respostas), usado pelo `filtrosDaNoite` com uma pessoa e pelo `filtrosJuntos` com duas. `recomendar.ts` ganha `buscarFilmes` (a busca nos streamings, o complemento sem provedor, as exclusões e os detalhes), usado por `recomendarNoite` e `recomendarJuntos`. É uma refatoração localizada, coberta pelos testes atuais do wizard |
| Sala | Tabela `salas_noite` (seção "Banco de dados"). O ID é um `uuid` aleatório (`gen_random_uuid()`), impossível de adivinhar; o link é `/noite/juntos/{uuid}` |
| Entrar pelo link | A página chama `entrar_sala_noite(sala)` ao abrir. Quem criou continua criador; a primeira outra pessoa logada vira convidada; uma terceira recebe "Essa sala já tem duas pessoas". Sem sessão, o `proxy.ts` leva ao login (a rota está sob `/noite`) |
| Responder | As perguntas usam o `PerguntaNoite` do wizard, com as respostas na URL da sala (`?humor=&exp=&com=`). Com as três, a tela mostra o resumo e o botão **"Enviar respostas"**, uma Server Action que chama `responder_sala_noite` |
| Esperar | Quem já respondeu vê "Esperando a outra pessoa responder…" e a página faz `router.refresh()` a cada 4 s (sem Realtime e sem dependência nova). O criador vê o link da sala enquanto ninguém entrou |
| Montar a sugestão | Com as duas respostas e sem resultado, a página monta um componente que chama a action `montarSala(sala)` uma vez: lê as restrições das duas pessoas (`restricoes_sala_noite`), roda `recomendarJuntos` e grava o resultado com `concluir_sala_noite`. Se as duas pessoas chegarem juntas, só a primeira gravação vale e as duas veem o mesmo resultado |
| Mesma sugestão para as duas | O resultado (IDs e motivos) fica gravado na sala. Cada tela busca os detalhes com `obterFilme` (cache de 24 h), então título, motivo e ordem são iguais para as duas; só o "Onde assistir" usa os streamings de quem está vendo |
| Respostas deixam de valer | Ao gravar o resultado, as respostas das duas pessoas são apagadas da sala, e `responder_sala_noite` recusa novas respostas. A sala expira em 3 h (no mínimo 1 h depois do resultado) e, expirada, ninguém mais lê nem entra |
| Nada vira preferência | Nada é gravado em `preferencias`, nos eventos ou na contagem de climas. "Vou ver esse!" grava só a escolha (como no wizard), e cada pessoa recebe o próprio "Como foi?" |
| Compartilhar o link | "Copiar link" (`navigator.clipboard`, com o link visível para copiar à mão se a cópia falhar) e "Enviar no WhatsApp" (`linkWhatsApp` da spec de compartilhar, com "Vamos escolher o filme de hoje juntos? Responde aqui:") |
| Sessão do wizard | A sala fica sob o layout de `/noite`, mas a sessão do wizard (`wizard_iniciado`, `wizard_abandonado`) só conta na própria `/noite`. Sair de `/noite` para a sala conta como abandono do wizard sozinho |
| Erros | TMDB fora do ar ao montar: a tela diz "Não conseguimos buscar os filmes agora" com "Tentar de novo" (nada é gravado). Nenhum filme possível: "Não achamos um filme que agrade aos dois" com "Escolher sozinho". Sala inexistente, expirada ou cheia: mensagem clara e link para o wizard. Erro do banco: mensagem genérica com "Tentar de novo" |
| Eventos | Nenhum evento novo (a lista é fechada no banco). O "Vou ver esse!" da sala registra `wizard_escolheu` com `trocas: 0`, como no wizard |

## Banco de dados

Migration nova `supabase/migrations/20261118233000_salas_noite.sql`.

### `public.salas_noite`

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()`: o segredo do link |
| `criador_id` | `uuid` | quem criou (`auth.uid()`), `on delete cascade` |
| `convidado_id` | `uuid`, nulo | a segunda pessoa; diferente do criador |
| `respostas_criador`, `respostas_convidado` | `jsonb`, nulo | `{humor, experiencia, companhia}`; apagadas quando o resultado é gravado |
| `resultado` | `jsonb`, nulo | `{filmes: [{id, motivo}]}`, até 4 KB |
| `criada_em` | `timestamptz` | |
| `expira_em` | `timestamptz` | `criada_em + 3 h` |

### RLS e funções

| Operação | Regra |
|---|---|
| Ler | Política de `select` só para o criador e o convidado, e só antes de `expira_em` |
| Inserir, alterar, apagar | **Nenhuma política.** Toda escrita passa pelas funções abaixo (`security definer`, `search_path` vazio, só para `authenticated`), cada uma com as checagens explícitas |
| `criar_sala_noite(p_segundos default 10800)` | Cria a sala do usuário e devolve o ID. A validade fica entre 1 s e 3 h (os testes usam poucos segundos para conferir a expiração). Apaga as salas expiradas do próprio usuário |
| `entrar_sala_noite(p_sala)` | Devolve `criador`, `convidado`, `cheia`, `expirada` ou `inexistente`. Ocupa a vaga de convidado só se ela estiver livre e a sala não tiver expirado (com `for update`, para duas pessoas não ocuparem a mesma vaga) |
| `responder_sala_noite(p_sala, p_humor, p_experiencia, p_companhia)` | Grava **só a resposta de quem chama** (a coluna sai de `auth.uid()`, nunca do parâmetro). Recusa quem não participa (`42501`), sala expirada ou já com resultado e slugs fora da lista (`22023`) |
| `restricoes_sala_noite(p_sala)` | Para os participantes, com as duas respostas: as respostas, a união dos gêneros evitados e dos streamings e os IDs que nenhuma das duas quer ver ("Já assisti" e reações). Nenhum dos dois lê as listas do outro pela tabela, mas quem participa da sala recebe a **união** desses IDs, que é o necessário para montar a sugestão |
| `concluir_sala_noite(p_sala, p_resultado)` | Grava o resultado se ainda não houver, apaga as respostas e garante pelo menos 1 h de sala depois disso. Devolve se gravou |

## Código

```
supabase/migrations/20261118233000_salas_noite.sql
src/lib/supabase/database.types.ts           salas_noite e as cinco funções (à mão)
src/features/noite/
  juntos.ts             tabelas da combinação, tomJuntos, filtrosJuntos, motivoJuntos
  filtros.ts            montarFiltros (compartilhado)
  recomendar.ts         buscarFilmes (compartilhado) e recomendarJuntos
  sala.ts               leitura da sala, resultado e estado da tela (server-only, com o cliente injetado)
  actions-sala.ts       criarSala, responderSala, montarSala
  components/
    juntos-botao.tsx      "Vamos escolher juntos" na primeira pergunta
    link-sala.tsx         "Copiar link" e "Enviar no WhatsApp"
    esperando-sala.tsx    "Esperando a outra pessoa…" com atualização
    montar-sala.tsx       chama montarSala uma vez; erro com "Tentar de novo"
    enviar-respostas.tsx  resumo e "Enviar respostas"
    resultado-sala.tsx    destaque, 2 opções e "Vou ver esse!"
    sala-indisponivel.tsx inexistente, expirada, cheia
src/app/(app)/noite/juntos/[sala]/page.tsx
```

## Critérios de aceitação

1. **Combinação** (`tests/unit/features/noite/juntos.test.ts`, testes de tabela):
   1. experiências iguais dão o tom 1 do wizard; `distrair` com outra dá o tom 1 da outra; cada par da tabela dá o tom da tabela, nas duas ordens;
   2. as exclusões das experiências entram menos os gêneros do tom (`rir` + `susto` exclui Thriller, mas não Terror);
   3. os humores somam: `cansado` de um lado limita a 110 min e ordena por popularidade; `nostalgico` de um lado limita a 2005; `pra-baixo` de um lado exclui os pesados, menos o gênero do tom;
   4. família de um lado só envia classificação até 12; `amigos` de um lado ordena por popularidade;
   5. o piso de qualidade está sempre presente; os evitados (união) estão sempre em `semGeneros`; um tom com gênero evitado cai para o tom da experiência do criador; com tudo evitado, `null`;
   6. o motivo diz "Os dois querem…" com a mesma experiência, "Um quer … e o outro quer …" com experiências diferentes, acrescenta "tem criança no sofá" com família e termina com tom, nota e onde ver.
2. **Recomendação** (`recomendar.test.ts`, API falsa): `recomendarJuntos` devolve 1 destaque + 2 opções com o motivo da sala, busca primeiro na união dos streamings, nunca devolve os IDs excluídos, devolve `null` sem filme e lança `NoiteIndisponivel` quando o TMDB falha sem sobrar filme. Os testes atuais de `recomendarNoite` e `filtrosDaNoite` passam sem mudança.
3. **Banco** (`tests/integration/noite-a-dois/salas.test.ts`, contra o Supabase local):
   1. o criador cria e lê a sala; uma pessoa que ainda não entrou não lê;
   2. a primeira pessoa com o link entra como convidada e passa a ler; uma terceira recebe `cheia` e continua sem ler; o criador que abre o próprio link continua `criador`; ID inexistente dá `inexistente`;
   3. cada um grava só a própria resposta; quem não participa recebe `42501`; um slug inválido é recusado; `update` e `insert` diretos na tabela não passam;
   4. `restricoes_sala_noite` devolve a união dos evitados, dos streamings e dos IDs de "Já assisti" e reações das duas pessoas, e recusa quem não participa;
   5. `concluir_sala_noite` grava o resultado uma vez só, apaga as respostas, e depois disso `responder_sala_noite` é recusada;
   6. uma sala expirada não é lida por ninguém e `entrar_sala_noite` devolve `expirada`.
4. **Actions** (`tests/unit/features/noite/sala.test.ts`, cliente falso): `responderSala` recusa respostas inválidas e não grava nada; `montarSala` grava o resultado de `recomendarJuntos`, não grava nada e devolve a mensagem quando o TMDB falha, e não chama o TMDB quando a sala já tem resultado.
5. **Telas** (unitários dos componentes): o link da sala tem "Copiar link" (copia a URL absoluta) e "Enviar no WhatsApp"; "Esperando a outra pessoa" chama `router.refresh` periodicamente; o resultado mostra o destaque, as 2 opções e "Vou ver esse!" e, depois da escolha, só o escolhido; a sala indisponível explica o motivo (expirada, cheia, inexistente).
6. **E2E** (`tests/e2e/noite-a-dois.spec.ts`, dois `browser.newContext()` com duas contas): a primeira pessoa toca em "Vamos escolher juntos", responde e espera; a segunda abre o link em 390 × 844, responde com "Enviar respostas" visível e clicável; as duas veem o mesmo destaque e o mesmo motivo ("Um quer rir e o outro quer ficar tenso: comédia de ação…"); uma terceira conta que abre o link vê "Essa sala já tem duas pessoas".
7. `/perfil` e as preferências não mudam depois da sala, e os E2E do wizard sozinho continuam passando.
8. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` e `pnpm check:secrets` sem erros, e o CI verde.

## Fora do escopo

| Item | Por quê |
|---|---|
| Tempo real (Supabase Realtime, websockets) | A atualização a cada 4 s basta para duas pessoas no mesmo sofá, e não traz dependência nova |
| "Esse não" e "Até que horas?" na sala | Exigiriam as duas pessoas concordarem de novo; a sala já traz 3 opções. Quem quiser trocar refaz sozinho no wizard |
| Mais de duas pessoas, "amigos" em grupo | O pedido fala de "os dois" |
| Entrar sem conta | A sala depende de `auth.uid()` para a RLS; quem não tem conta faz o cadastro e volta ao link |
| Séries na sala | Fica para depois da spec de séries no wizard |
| Limpeza periódica das salas expiradas | As expiradas ficam inacessíveis; o próprio usuário limpa as suas ao criar outra sala. Um job de limpeza não é necessário para o volume da AP2 |
| Mostrar o nome de quem criou a sala antes de entrar | A RLS só deixa ler a sala depois de entrar; mostrar o nome antes exigiria expor o perfil a quem tem o link |
