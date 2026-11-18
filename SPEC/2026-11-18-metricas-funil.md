# Spec: Funil do wizard no /metricas

- **Data:** 2026-11-18
- **Componente:** metricas (funil e detalhes dos eventos)
- **Status:** aprovada para implementação
- **Substitui:** nenhuma (amplia a página `/metricas` de [2026-11-18-metricas.md](2026-11-18-metricas.md))
- **Issue:** #17 (rótulo `pergunta-cliente`)

## O quê

A página `/metricas` ganha, acima das tabelas de totais, uma seção **"Funil e detalhes"** com números e barras simples:

- o **funil do wizard**: abriram → chegaram à recomendação → clicaram "Vou ver esse!", com a porcentagem de cada etapa em relação ao início e à etapa anterior;
- o **funil do "Como foi?"**: exibido → respondido;
- as **trocas por motivo**, as **trocas até escolher**, as **saídas sem escolher por etapa**, as **respostas do "Como foi?"** e os **trailers por origem**.

Um seletor **Todos / Sem a equipe** troca todas as contagens da seção entre o total e a coluna "sem a equipe" da spec de métricas.

Nada novo é gravado: tudo sai dos eventos que já existem.

## Por quê

[Pedido do cliente, seção 3.1](../docs/ap2/pedido-do-cliente.md#31-métricas-de-uso-fazer-primeiro): "a AP2 pede evidência de uso, e nós também queremos saber se o wizard é usado e se as pessoas chegam até o fim." Os totais soltos por evento não respondem "chegam até o fim"; o funil responde. Os motivos das trocas e as respostas do "Como foi?" já são gravados em `eventos.dados` justamente para isso (seções 3.2 e 3.3), mas as funções atuais só somam por nome do evento.

O funil não está escrito no pedido. A pergunta ao cliente está na issue #17. A decisão conservadora, enquanto não há resposta: as visões ficam **só no `/metricas`**, que continua visível apenas para quem está em `equipe_metricas`, e nenhum dado novo é gravado.

## Visões

| Visão | Eventos | Chave de `dados` | Valores, na ordem exibida |
|---|---|---|---|
| Funil do wizard | `wizard_iniciado` → `wizard_concluido` → `wizard_escolheu` | | |
| Funil do "Como foi?" | `como_foi_exibido` → `como_foi_respondido` | | |
| Trocas por motivo | `wizard_troca` | `motivo` | Já vi, Não é o clima, Muito longo, Outro |
| Trocas até escolher | `wizard_escolheu` | `trocas` | De primeira, Depois de 1 troca, ..., Depois de 5 trocas |
| Saídas sem escolher | `wizard_abandonado` | `etapa` | Nas perguntas, No resultado |
| Respostas do "Como foi?" | `como_foi_respondido` | `resposta` | Amei, Gostei, Não é pra mim, Não cheguei a ver |
| Trailers por origem | `trailer_aberto` | `origem` | Página do filme, Wizard da noite |

Os valores são as listas fechadas de `src/features/metricas/eventos.ts` (`MOTIVOS_TROCA`, `MAX_TROCAS`, `ETAPAS_WIZARD`, `RESPOSTAS_COMO_FOI`, `ORIGENS_TRAILER`). Os rótulos das etapas dos funis são os de `ROTULOS_EVENTO`, e os das respostas do "Como foi?" são os de `ROTULOS_REACAO` mais "Não cheguei a ver", como no cartão do dashboard.

## Decisões técnicas

| Tema | Decisão |
|---|---|
| Fonte dos funis | `metricas_eventos()`, que já existe. Nenhuma consulta nova para o funil |
| Fonte dos detalhes | Função nova `metricas_detalhes()`, que soma os eventos por `(nome, chave, valor)` de `dados` (`jsonb_each_text`), com `total` e `sem_equipe`. Mesmo controle das funções atuais: `security definer` e `exigir_equipe_metricas()` |
| Função genérica | A função soma qualquer chave de `dados`; a página escolhe o que mostra. Um evento novo com dados aparece na função sem migration nova |
| Valores desconhecidos | O banco não restringe os valores de `dados` (só a rota, com zod). A página mostra apenas os valores das listas fechadas e ignora o resto |
| Base das porcentagens | Ocorrências de eventos, como a coluna "Total", não pessoas distintas. Etapa do funil: % do início e % da etapa anterior. Detalhe: % da soma dos valores mostrados. Arredondadas para inteiro |
| Base zero | Sem porcentagem (nunca `NaN` nem divisão por zero): a linha mostra só o número 0 e a barra vazia |
| Etapa maior que a anterior | Pode acontecer: o resultado aberto por um link não passa por `wizard_iniciado`, e dá para clicar "Vou ver esse!" em duas opções da mesma noite. O texto mostra a porcentagem real (ex.: 120%) e a barra para em 100% |
| "Como foi?" exibido | Conta visitas: a mesma escolha pode ser exibida em até 2 visitas (spec do "Como foi?"). A legenda do funil diz isso |
| Recorte | `?recorte=sem-equipe` troca todas as contagens da seção para a coluna "sem a equipe"; qualquer outro valor é "Todos". São dois links com `aria-current`, como as abas de `/listas`, sem JavaScript no navegador. As tabelas de totais continuam mostrando as três colunas |
| Barras | Um `div` com a largura em %, `aria-hidden`. O número e a porcentagem estão sempre no texto da linha, então a informação não depende da largura nem da cor. O rótulo fica acima da barra, que ocupa a largura toda: cabe em 390 px. Cores do tema (`bg-primary` sobre `bg-muted`) |
| Sem biblioteca de gráficos | Listas ordenadas (`ol`) e `div`s. Nenhuma dependência nova |
| Climas do wizard | Continuam fora: não estão em `eventos.dados`, e o funil não cruza eventos com `contagem_climas` |
| Onde fica | Lógica pura em `src/features/metricas/funil.ts` (testável sem banco), rótulos em `rotulos.ts`, componente em `components/funil-metricas.tsx`. `obterMetricas` passa a ler também `metricas_detalhes` |
| Ordem do deploy | A página chama a função nova. Depois do merge, `supabase db push` logo em seguida; até lá, o `/metricas` cai na página de erro (só a equipe a vê) |

## Banco de dados

Migration `supabase/migrations/20261118181500_metricas_detalhes.sql`. Nenhuma tabela muda.

- **Função `public.metricas_detalhes()`**
  - `returns table (nome text, chave text, valor text, total bigint, sem_equipe bigint)`
  - `language plpgsql`, `stable`, `security definer`, `set search_path = ''`.
  - Começa com `perform public.exigir_equipe_metricas()`: quem não está em `equipe_metricas` recebe `insufficient_privilege` (`42501`).
  - Agrupa `public.eventos` com `cross join lateral jsonb_each_text(dados)` por `nome`, `chave` e `valor`. `sem_equipe` exclui os `usuario_id` de `equipe_metricas`, como em `metricas_eventos()`.
  - `revoke execute ... from public, anon` e `grant execute ... to authenticated`.
- `src/lib/supabase/database.types.ts` ganha a função, editado à mão no formato gerado.

### Consulta SQL equivalente

Para rodar no editor SQL do Supabase, como evidência:

```sql
select e.nome, d.chave, d.valor,
       count(*) as total,
       count(*) filter (where e.usuario_id not in (select usuario_id from public.equipe_metricas)) as sem_equipe
from public.eventos e
cross join lateral jsonb_each_text(e.dados) as d (chave, valor)
group by e.nome, d.chave, d.valor
order by e.nome, d.chave, total desc;
```

## Código

```
supabase/migrations/20261118181500_metricas_detalhes.sql
src/features/metricas/
  funil.ts                      lerRecorte, porcentagem, larguraBarra, calcularFunil, distribuir  (lógica pura)
  rotulos.ts                    + rótulos de motivo, trocas, etapa do abandono, resposta do "Como foi?" e origem
  consultas.ts                  obterMetricas lê também metricas_detalhes
  components/funil-metricas.tsx seletor do recorte, funis e detalhes
src/app/(app)/metricas/page.tsx lê ?recorte e mostra a seção acima das tabelas
```

## Critérios de aceitação

1. `pnpm db:reset` aplica as migrations do zero sem erros (CI).
2. **Lógica pura** (`tests/unit/features/metricas/funil.test.ts`):
   1. `lerRecorte` reconhece `sem-equipe`; qualquer outro valor (inclusive ausente ou repetido) vira `todos`;
   2. `calcularFunil` sem nenhum evento devolve as etapas com 0 e sem porcentagem;
   3. com eventos, devolve as etapas na ordem pedida, com a % do início e da etapa anterior arredondadas, e ignora os outros eventos;
   4. no recorte `sem-equipe`, usa a coluna "sem a equipe";
   5. uma etapa maior que a anterior dá mais de 100% no texto, e `larguraBarra` limita a 100 (e dá 0 sem porcentagem);
   6. `distribuir` devolve todos os valores da lista, na ordem, com 0 para os ausentes e a % da soma; sem eventos, todos 0 e sem porcentagem; ignora valores fora da lista, outras chaves e outros eventos.
3. **Consulta e página** (`tests/unit/features/metricas/pagina.test.tsx`):
   1. `obterMetricas` lê `metricas_detalhes` e converte `sem_equipe`; `42501` em qualquer uma das três funções devolve `null`;
   2. o funil do wizard mostra as três etapas com o número e as porcentagens em texto, e as barras são `aria-hidden`;
   3. cada detalhe da tabela "Visões" mostra todos os seus valores com o rótulo em português, o número e a porcentagem;
   4. com `?recorte=sem-equipe`, os números passam a ser os da coluna "sem a equipe" e o link "Sem a equipe" fica marcado com `aria-current`;
   5. sem nenhum evento, a seção mostra zeros, sem porcentagem e sem `NaN`;
   6. a página continua respondendo 404 para quem não é da equipe.
4. **Integração** (`tests/integration/metricas/metricas.test.ts`, Supabase local): `metricas_detalhes()` lança `42501` para quem está logado e não é da equipe, e não responde a quem não está logado. (O caminho da equipe exige a chave de serviço, que os testes não usam; ele é coberto pelos unitários 3.1 a 3.5 e verificado à mão na produção.)
5. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` e `pnpm check:secrets` sem erros, e o CI verde.
6. Na produção, depois do merge e do `supabase db push`: o `/metricas` mostra o funil e os detalhes para quem está em `equipe_metricas`, também na largura de um celular, e 404 para os demais.

## Fora do escopo

| Item | Onde fica |
|---|---|
| Funil por pessoa (pessoas distintas em cada etapa) | não planejado: as etapas são contadas em ocorrências, como a coluna "Total" |
| Filtro por período, série no tempo, exportação | não planejado, como na spec de métricas |
| Climas no funil ou cruzados com eventos | proibido pelo pedido (3.1): os climas só existem na contagem anônima |
| E2E do `/metricas` | não planejado: entrar na equipe exige a chave de serviço, que os testes não usam |
| Restringir no banco os valores de `dados` | não planejado: a rota valida com zod e a página ignora valores fora das listas |
| Mostrar o funil fora do `/metricas` | depende da resposta do cliente na issue #17 |
