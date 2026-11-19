# Spec: "Até que horas?" no wizard da noite

- **Data:** 2026-11-18
- **Componente:** noite (ajuste opcional do resultado do wizard)
- **Status:** aprovada para implementação
- **Substitui:** nenhuma (estende [2026-11-18-wizard-noite.md](2026-11-18-wizard-noite.md))
- **Issue:** #22 (`pergunta-cliente`)

## O quê

No resultado do wizard, acima do filme da noite, uma linha opcional **"Até que horas?"** com cinco botões: **Tanto faz** (já marcado), **22h**, **23h**, **Meia-noite** e **1h**. Escolhido um horário, o wizard só sugere filmes que, **começando agora**, terminam até essa hora. O "Começando agora, termina às…" que já existe passa a respeitar o horário.

Se não der tempo para um filme até a hora escolhida (a hora já passou ou faltam menos de 60 minutos), a tela diz isso com clareza e oferece "Tanto faz o horário" e "Refazer as perguntas", sem sugerir filme que passa do horário.

## Por quê

[Pedido do cliente, seção 3.2](../docs/ap2/pedido-do-cliente.md#32-wizard-o-que-ver-hoje-a-principal) ("Tela de resultado", item 2: "Começando agora, termina às 23h40" serve para ajudar a decidir) e [seção 3.4](../docs/ap2/pedido-do-cliente.md#34-trailer-e-termina-às-no-resultado). Quem precisa dormir cedo só descobre que o filme é longo demais depois de vê-lo e gasta uma troca em "Muito longo". Dizer o limite uma vez ajuda a decidir mais rápido, que é o filtro do cliente.

O pedido diz que o "termina às" **não é uma pergunta**. Por isso a dúvida foi para o cliente na issue #22, e a decisão conservadora é esta: o filtro é **opcional**, fica no resultado (não vira uma 4ª tela), não muda os 4 cliques até a primeira recomendação e não grava nada.

## Decisões técnicas

| Tema | Decisão |
|---|---|
| Onde aparece | No resultado (`/noite` com as três respostas), acima do filme, fora do `Suspense`: aparece enquanto o filme carrega e também nas telas "sem filme" e "sem tempo". As perguntas não mudam, então **dashboard + 3 respostas continuam sendo 4 cliques** |
| Por que não é uma tela | Uma 4ª tela, mesmo com "Tanto faz", custaria um clique a mais para todo mundo. `PERGUNTAS` continua com as três perguntas do clima, que são as que entram na contagem anônima de climas |
| Horários | `HORAS_LIMITE = [22, 23, 0, 1]` (meia-noite é `0`, 1h é `1`), com os rótulos em `opcoes.ts`. "Tanto faz" é a ausência de horário |
| Fuso horário | O servidor (Vercel) roda em UTC; o horário que importa é o da pessoa. **O navegador calcula** quantos minutos faltam até a hora escolhida, no relógio dele, no momento do clique, e manda na URL. O servidor nunca lê o relógio para isso. Assim o fuso nunca chega ao servidor e o E2E controla o horário com `page.clock` |
| Estado na URL | Dois parâmetros novos, **sempre juntos**: `ate` (22, 23, 0 ou 1) e `tempo` (minutos que faltavam, de 0 a 1440). Um sem o outro, ou valor inválido, é ignorado (fica "Tanto faz"). Nada vai para o banco, o perfil ou os eventos |
| Cálculo (`minutosAte(hora, agora)`) | Minutos de `agora` até a próxima vez que o relógio marca `hora`, com a virada da meia-noite (23h30 → 1h = 90 min; 23h30 → meia-noite = 30 min). Se a hora passou há menos de 6 h (diferença acima de 18 h, ou exatamente agora), devolve **0**: "já passou". Ex.: 23h30 → 23h = 0; 0h30 → meia-noite = 0; 15h → 22h = 420 |
| Filtro | `tempo` entra nos limites de duração de `filtrosDaNoite` junto com o do `cansado` (110) e o do "Muito longo" (`max`): **vale o menor dos três** |
| Conferência | O horário é uma promessa ("termina até as 23h"), então `recomendarNoite` também confere nos detalhes: com `tempo`, descarta filme sem duração conhecida ou mais longo que `tempo`. Os outros limites continuam só no filtro do TMDB, como antes |
| Sem tempo | `TEMPO_MINIMO = 60`. Com `tempo` abaixo disso, a página nem consulta o TMDB e mostra `SemTempo`: "Não dá tempo de ver um filme até as 23h", com "Esse horário já passou." (`tempo` 0) ou "Faltam só 30 minutos." e os links "Tanto faz o horário" (mesma URL sem `ate`/`tempo`) e "Refazer as perguntas" |
| Escolher um horário | Um clique: `router.push` para a URL atual com `ate` e `tempo`. Mantém tom, `max`, `vistos` e `trocas`: ajustar o horário não é troca e não gasta "Esse não". "Tanto faz" tira os dois parâmetros |
| URL velha | `tempo` envelhece (recarregar a página meia hora depois, voltar no histórico). Ao montar, o componente recalcula `minutosAte` e, se a diferença para o `tempo` da URL passar de **5 minutos**, troca a URL (`router.replace`) pelo valor atual. Isso também corrige um link aberto em outro dia |
| Trocas | `proximaRodada` e `urlsDaTroca` levam `ate` e `tempo` adiante sem mudar: o horário vale para todas as rodadas da sessão |
| Ordem na URL | `ate` e `tempo` logo depois das respostas: `/noite?humor=cansado&exp=rir&com=a-dois&ate=23&tempo=90&tom=1...`. `trocas` continua no fim |
| Acessibilidade | Os botões ficam num `role="group"` com o nome "Até que horas?" e usam `aria-pressed` para o horário escolhido. Altura mínima de 40 px, quebrando linha em 390 px |
| Eventos | Nenhum evento novo. O horário não entra em `wizard_concluido` nem na contagem de climas |

### Exemplos do cálculo

| Agora (relógio da pessoa) | Escolha | `tempo` | Resultado |
|---|---|---|---|
| 21h30 | 23h | 90 | filmes de até 90 min (ou menos, se `cansado`/`max` pedirem) |
| 21h30 | 22h | 30 | "Não dá tempo… até as 22h. Faltam só 30 minutos." |
| 23h30 | Meia-noite | 30 | "Não dá tempo… até a meia-noite. Faltam só 30 minutos." |
| 23h30 | 1h | 90 | filmes de até 90 min: a virada da meia-noite |
| 23h30 | 23h | 0 | "Não dá tempo… até as 23h. Esse horário já passou." |
| 0h30 | Meia-noite | 0 | "já passou" (não é a meia-noite de amanhã) |
| 15h00 | 22h | 420 | na prática sem limite: os outros limites são menores |

## Banco de dados

Nenhuma mudança. O horário vive só na URL.

## Código

```
src/features/noite/
  opcoes.ts         HORAS_LIMITE, ROTULOS_HORA ("22h", "Meia-noite"), ATE_A_HORA ("até a meia-noite")
  mapeamento.ts     TEMPO_MINIMO (60)
  termina.ts        minutosAte(hora, agora)
  estado.ts         ate e tempo em EstadoNoite, lerEstado e urlDaNoite; comHorario(estado, hora, agora)
  filtros.ts        tempo entre os limites de duração (o menor vale)
  recomendar.ts     confere a duração nos detalhes quando há tempo
  components/
    ate-que-horas.tsx       os botões, o clique e a correção da URL velha (navegador)
    sem-tempo.tsx           "Não dá tempo de ver um filme até as 23h"
    recomendacao-noite.tsx  SemTempo antes de consultar o TMDB
src/app/(app)/noite/page.tsx   AteQueHoras acima do resultado
tests/e2e/tmdb-falso/servidor.mjs   with_runtime.lte abaixo de 100: filmes "Curto", de 80 min
```

## Critérios de aceitação

1. **Cálculo** (`tests/unit/features/noite/termina.test.ts`, de tabela): `minutosAte` dá 90 de 21h30 até 23h, 90 de 23h30 até 1h e 30 de 23h30 até meia-noite (virada da meia-noite), 0 de 23h30 até 23h, de 0h30 até meia-noite e exatamente às 23h até 23h (já passou), e 420 de 15h até 22h.
2. **Estado** (`estado.test.ts`): `lerEstado` lê `ate` e `tempo` juntos e ignora um sem o outro, hora fora da lista e `tempo` fora de 0 a 1440; `urlDaNoite` escreve os dois logo depois das respostas e é o inverso de `lerEstado`; `proximaRodada` mantém o horário; `comHorario` calcula o `tempo` com o relógio dado e, com `null`, tira os dois.
3. **Filtro** (`filtros.test.ts`): `tempo` vira `duracaoMax`; com `cansado` (110) e `max` (100), vale o menor dos três (ex.: `tempo` 90 → 90; `tempo` 300 → 100).
4. **Recomendação** (`recomendar.test.ts`): com `tempo`, o TMDB recebe o limite, e filme mais longo que `tempo` ou sem duração, se o TMDB devolver, não é recomendado; sem `tempo`, nada muda.
5. **Tela** (`ate-que-horas.test.tsx`): "Tanto faz" vem marcado; clicar "23h" às 21h30 leva à URL com `ate=23&tempo=90` mantendo o resto; "Tanto faz" tira o horário; com `tempo` velho (mais de 5 min de diferença), a URL é trocada pelo valor atual; com `tempo` em dia, nada acontece.
6. **Sem tempo** (`resultado.test.tsx`): com `tempo` abaixo de 60, `RecomendacaoNoite` não consulta o TMDB e mostra "Não dá tempo de ver um filme até as 23h", "Esse horário já passou." (0) ou "Faltam só 30 minutos.", "Tanto faz o horário" (URL sem horário) e "Refazer as perguntas".
7. **E2E** (`tests/e2e/noite.spec.ts`, em 390 × 844, fuso de São Paulo e relógio fixo em 23h30 com `page.clock`): o caminho de 4 cliques continua igual, com "Tanto faz" marcado; "23h" diz que o horário já passou; "1h" traz um filme "Curto" que termina às 0h50, com "Vou ver esse!" visível; "Tanto faz" volta ao filme sem limite.
8. Os E2E do wizard que já existem passam sem mudança, e `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` e `pnpm check:secrets` ficam sem erros, com o CI verde.

## Fora do escopo

| Item | Por quê |
|---|---|
| Horário livre (digitar 22h15) | O pedido quer cliques em cartões, nada de digitar. Cinco horários cobrem a noite |
| Guardar o horário preferido da pessoa | Respostas do wizard não viram preferência (pedido, seção 1) |
| Usar o horário em séries ("um episódio até as 23h") | Fica para a spec de séries no wizard (`series-noite`), se o cliente quiser |
| Margem para os créditos ou para decidir | O "termina às" do pedido é hora atual + duração; a mesma conta vale aqui |
