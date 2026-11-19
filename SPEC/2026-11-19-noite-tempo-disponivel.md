# Spec: "Até que horas?" relativo à hora atual, com horário livre

- **Data:** 2026-11-19
- **Componente:** noite (ajuste opcional do resultado do wizard)
- **Status:** aprovada para implementação
- **Substitui:** a parte dos **horários fixos** de [2026-11-18-noite-ate-que-horas.md](2026-11-18-noite-ate-que-horas.md) (botões 22h, 23h, meia-noite e 1h, e o parâmetro `ate` com a hora cheia). O resto daquela spec continua valendo: o filtro é opcional, fica no resultado, a conta é feita no navegador, o limite vale junto com o `cansado` e o "Muito longo", a duração é conferida nos detalhes e "sem tempo" não consulta o TMDB
- **Issue:** #31

## O quê

O "Até que horas?" passa a oferecer, além do **Tanto faz** (já marcado):

1. **Tempo a partir de agora:** **1h30**, **2h**, **2h30** e **3h**. Cada botão mostra embaixo o horário de término no relógio da pessoa ("até as 18h06" às 16h06) e anda com o relógio.
2. **Outro horário:** abre um seletor de horário (`<input type="time">`, a roda de horas do celular) e o botão **"Usar"**. O wizard só sugere o que termina até esse horário, como antes.

## Por quê

[Pedido do cliente, seção 3.2](../docs/ap2/pedido-do-cliente.md#32-wizard-o-que-ver-hoje-a-principal) ("Tela de resultado", item 2: o "termina às" serve para ajudar a decidir) e [seção 3.4](../docs/ap2/pedido-do-cliente.md#34-trailer-e-termina-às-no-resultado). Na validação da produção às 16h06, nenhum dos horários fixos mudava a sugestão: faltavam 6 horas ou mais, e os outros limites (110 min do `cansado`, "Muito longo") já eram menores. Os horários fixos só serviam tarde da noite. O tempo relativo serve a qualquer hora, e o horário livre cobre quem tem um compromisso numa hora quebrada (22h15).

O pedido quer "cliques em cartões, nada de digitar". O seletor de horário é uma roda no celular, não um campo de texto, e só aparece para quem toca em "Outro horário". Os 4 cliques até a primeira recomendação não mudam.

## Decisões técnicas

| Tema | Decisão |
|---|---|
| Opções relativas | `JANELAS_MIN = [90, 120, 150, 180]`, rótulos "1h30", "2h", "2h30" e "3h". Começam em 1h30 porque `TEMPO_MINIMO` do filme é 60 e quase nenhum filme cabe em 1h |
| Estado na URL | **Relativo:** só `tempo` (os minutos escolhidos). **Outro horário:** `ate` com a hora em `HHMM` (`2215`, `0030`) **e** `tempo`, os minutos que faltavam no relógio do navegador. `ate` sem `tempo`, ou fora de `0000`–`2359`, é ignorado. URL antiga (`ate=23&tempo=90`) vira o relativo de 90 min |
| Hora do término nos botões | Calculada no navegador (`useSyncExternalStore` com `aCadaMeioMinuto`, como o `TerminaAs`). No servidor, que roda em UTC, o botão mostra só "2h" |
| Botão marcado | Relativo: `tempo` igual ao da opção e sem `ate`. Outro horário: com `ate`, mostra "até as 22h15" e já abre o seletor com esse horário |
| URL velha | Só para o **Outro horário**: ao montar, recalcula `minutosAte` e troca a URL (`router.replace`) se a diferença passar de 5 minutos, como antes. O relativo não envelhece: "tenho 2h" vale a partir de quando a página é aberta |
| `minutosAte(minutoDoDia, agora)` | Passa a receber o minuto do dia (0 a 1439) em vez da hora cheia. A regra de "já passou" continua: uma hora que ficou até 6 h para trás devolve 0 |
| Sem tempo | `tempo` abaixo de `tempoMinimo` (60 para filme, 20 para episódio), com ou sem `ate`. Com `ate`: "Não dá tempo de ver um filme até as 22h15". Sem `ate`: "Não dá tempo de ver um filme em 30 minutos" |
| Rótulo do horário (`ateAs`) | "até as 22h", "até as 22h15", "até a 1h", "até a 0h30", "até a meia-noite", "até o meio-dia" |
| Acessibilidade | O grupo continua `role="group"` com o nome "Até que horas?" e `aria-pressed`. O seletor tem rótulo "Horário". Os botões têm no mínimo 40 px de altura e quebram linha em 390 px |
| Eventos | Nenhum evento novo. O horário não entra em `wizard_concluido` nem na contagem de climas |

### Exemplos

| Agora | Escolha | URL | Resultado |
|---|---|---|---|
| 16h06 | 2h | `tempo=120` | filmes de até 110 min com `cansado` (vale o menor), ou de até 120 sem ele; botão "2h · até as 18h06" |
| 21h30 | 1h30 | `tempo=90` | filmes de até 90 min |
| 21h30 | Outro horário 22h15 | `ate=2215&tempo=45` | "Não dá tempo de ver um filme até as 22h15. Faltam só 45 minutos." |
| 23h30 | Outro horário 1h00 | `ate=0100&tempo=90` | filmes de até 90 min, virando a meia-noite |
| 23h30 | Outro horário 23h00 | `ate=2300&tempo=0` | "Esse horário já passou." |

## Banco de dados

Nenhuma mudança.

## Código

```
src/features/noite/opcoes.ts       JANELAS_MIN e rótulos; sai HORAS_LIMITE/ROTULOS_HORA/ATE_A_HORA
src/features/noite/termina.ts      minutosAte(minutoDoDia, agora), ateAs(minutoDoDia), lerHorario("22:15")
src/features/noite/estado.ts       ate em minutos do dia; lerEstado/urlDaNoite com HHMM; comJanela e comHorario
src/features/noite/components/ate-que-horas.tsx   opções relativas, "Outro horário" e o seletor
src/features/noite/components/sem-tempo.tsx       mensagem com ou sem horário
src/features/noite/components/recomendacao-noite.tsx   "sem tempo" sem exigir `ate`
```

## Critérios de aceitação

1. **Cálculo** (`tests/unit/features/noite/termina.test.ts`): `minutosAte` com minutos quebrados (21h30 até 22h15 = 45; 23h30 até 0h30 = 60) e a regra de "já passou"; `ateAs` com os rótulos da tabela; `lerHorario` aceita "22:15" e recusa texto inválido.
2. **Estado** (`tests/unit/features/noite/estado.test.ts`): `tempo` sozinho é o relativo; `ate=2215&tempo=45` é o outro horário; `ate` inválido (`2460`, `23`) com `tempo` vira o relativo e sem `tempo` é ignorado; `urlDaNoite` faz o caminho inverso; a próxima rodada mantém os dois.
3. **Componente** (`tests/unit/features/noite/ate-que-horas.test.tsx`): às 16h06, os botões mostram "1h30 até as 17h36" … "3h até as 19h06"; "2h" manda `tempo=120`, mantendo a rodada; "Outro horário" com 22h15 às 21h30 manda `ate=2215&tempo=45`; "Tanto faz" tira os dois; URL velha do outro horário é recalculada e a do relativo não.
4. **Sem tempo** (unitário): com `ate`, "até as 22h15"; sem `ate`, "em 30 minutos".
5. **E2E** (`tests/e2e/noite.spec.ts`), às 23h30 em 390 px: "Tanto faz" marcado; "1h30" traz um filme curto que termina às 0h50; "Outro horário" 23h00 avisa que já passou; "Tanto faz" volta ao filme inicial.
6. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` e `pnpm check:secrets` sem erros, e o CI verde.

## Fora do escopo

| Item | Por quê |
|---|---|
| Lembrar o horário escolhido entre sessões | o wizard não guarda nada da noite (pedido, 3.2) |
| Opções relativas diferentes para série | 1h30 já cabe vários episódios; a mesma lista serve aos dois |
