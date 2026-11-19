# Spec: compartilhar a noite escolhida

- **Data:** 2026-11-18
- **Componente:** noite (botão opcional depois do "Vou ver esse!")
- **Status:** aprovada para implementação
- **Substitui:** nenhuma (estende [2026-11-18-wizard-noite.md](2026-11-18-wizard-noite.md) e usa o "termina às" de [2026-11-18-noite-ate-que-horas.md](2026-11-18-noite-ate-que-horas.md))
- **Issue:** #25 (`pergunta-cliente`)

## O quê

Depois do **"Vou ver esse!"** no resultado do wizard, ao lado da confirmação "Boa sessão!", aparece um botão para avisar quem vai assistir junto:

> Hoje vamos ver {título}, termina às {hora}
> https://{endereço do app}/filme/{id}

- **Com a Web Share API** (`navigator.share`, típica do celular): o botão **"Compartilhar"** abre a folha de compartilhamento do aparelho com a mensagem e o link.
- **Sem ela** (a maioria dos navegadores de computador): um link **"Compartilhar no WhatsApp"** para `https://wa.me/?text=<mensagem e link codificados>`, aberto em nova aba.

Nada é gravado: nem no banco, nem no perfil, nem nos eventos.

## Por quê

[Pedido do cliente, seção 3.2](../docs/ap2/pedido-do-cliente.md#32-wizard-o-que-ver-hoje-a-principal): a pergunta 4 é "Com quem vai assistir?" e o "Vou ver esse!" fecha a noite ([3.3](../docs/ap2/pedido-do-cliente.md#33-como-foi)). Quem vai ver a dois, com a família ou com amigos ainda precisa avisar os outros do filme e do horário. Uma mensagem pronta, a um toque, fecha a decisão sem digitar, que é o filtro do cliente ("ajuda a decidir mais rápido?").

O pedido **não pede compartilhamento**. Por isso a dúvida foi para o cliente na issue #25, e a decisão conservadora é esta: o botão só aparece **depois** da escolha (não muda os 4 cliques nem a escolha), é opcional e não grava nada.

## Decisões técnicas

| Tema | Decisão |
|---|---|
| Onde aparece | Em `ResultadoNoite`, junto do `VouVerEsse` do filme escolhido (no `acoes` do `FilmeDestaque` ou na `acao` da `OpcaoNoite`), só depois que a escolha foi gravada. Antes da escolha, nada muda na tela |
| Mensagem (`mensagemDaNoite`) | `Hoje vamos ver {título}, termina às {hora}`. A hora é `terminaAs(agora, duracaoMin)`, a mesma conta do "Começando agora, termina às…". Sem duração conhecida, só `Hoje vamos ver {título}` (não inventa hora) |
| Hora | Calculada **no navegador**, no fuso da pessoa (o servidor roda em UTC). No caminho da Web Share, com o relógio do momento do clique. No link do WhatsApp, o `href` acompanha o relógio a cada 30 s, como o `TerminaAs`, e por isso bate com a hora que a tela mostra |
| Link do filme (`urlDoFilme`) | URL absoluta de `/filme/{id}` com `window.location.origin`, nunca um endereço fixo: vale na produção, nas prévias e no E2E. A página do filme exige login, como o resto do app |
| Web Share | `navigator.share({ text: mensagem, url })`. Se a pessoa cancela (`AbortError`), nada acontece e nenhum erro aparece. Outra falha (`NotAllowedError`, por exemplo) troca o botão pelo link do WhatsApp, para a pessoa ainda conseguir avisar |
| WhatsApp (`linkWhatsApp`) | `https://wa.me/?text=` + `encodeURIComponent("{mensagem}\n{link}")`: acentos, `&`, `#`, `?` e a quebra de linha vão codificados, então um título como "Velozes & Furiosos #7" não corta a mensagem. Abre com `target="_blank"` e `rel="noopener"` |
| Detecção | `typeof navigator.share === "function"`, lida no navegador com `useSyncExternalStore` (no servidor, nada é mostrado; o botão só existe depois de um clique, então não há diferença de hidratação) |
| Aparência | `outline` (o "Vou ver esse!" continua sendo o principal), ícone de compartilhar, altura de 48 px para o toque no celular |
| Eventos | **Nenhum.** A lista de eventos é fechada também no banco (`check` em `eventos.nome`, migration `20261118120000_metricas.sql`); medir o compartilhamento exigiria migration. Fica em "Fora do escopo" |

## Banco de dados

Nenhuma mudança.

## Código

```
src/features/noite/
  compartilhar.ts                 mensagemDaNoite, urlDoFilme, linkWhatsApp (lógica pura)
  components/
    compartilhar-noite.tsx        o botão da Web Share e o link do WhatsApp
    resultado-noite.tsx           CompartilharNoite junto do filme escolhido
    termina-as.tsx                exporta o relógio de 30 s para reaproveitar
```

## Critérios de aceitação

1. **Mensagem** (`tests/unit/features/noite/compartilhar.test.ts`): às 21h45, com 115 min, `mensagemDaNoite` dá "Hoje vamos ver {título}, termina às 23h40"; atravessa a meia-noite (23h30 + 125 min = 1h35); sem duração, não tem "termina às". `urlDoFilme` junta a origem e `/filme/{id}`.
2. **WhatsApp** (mesmo arquivo): `linkWhatsApp` começa com `https://wa.me/?text=`, e o texto decodificado é exatamente "{mensagem}\n{link}"; um título com acento, `&`, `#` e `?` aparece codificado (`%26`, `%23`, `%3F`, `%C3%A9`), sem `&` nem `#` crus depois do `?text=`.
3. **Sem Web Share** (`compartilhar-noite.test.tsx`): aparece o link "Compartilhar no WhatsApp" com o `href` da mensagem e do link do filme (origem do navegador), `target="_blank"` e `rel` com `noopener`; não há botão "Compartilhar".
4. **Com Web Share** (mesmo arquivo): o botão "Compartilhar" chama `navigator.share` com a mensagem da hora do clique e a URL do filme; cancelar (`AbortError`) não mostra erro nem link; outra falha troca o botão pelo link do WhatsApp.
5. **Resultado** (`resultado.test.tsx`): antes do "Vou ver esse!", não há compartilhar; depois dele, no destaque ou numa opção menor, aparece o compartilhar do filme escolhido (e só dele).
6. **E2E** (`tests/e2e/noite.spec.ts`, em 390 × 844, fuso de São Paulo, relógio fixo em 23h30 e sem `navigator.share`): depois do "Vou ver esse!", o link "Compartilhar no WhatsApp" fica visível na tela, e o `href` traz "Hoje vamos ver Filme 35020, termina às 1h35" e a URL absoluta de `/filme/35020`. O WhatsApp não é aberto.
7. Os E2E do wizard que já existem passam sem mudança, e `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` e `pnpm check:secrets` ficam sem erros, com o CI verde.

## Fora do escopo

| Item | Por quê |
|---|---|
| Evento `noite_compartilhada` | A lista de eventos é fechada no banco; medir exigiria migration. Se o cliente aprovar o botão (issue #25), entra numa spec de métricas |
| Página pública do filme para quem recebe sem conta | O link leva à página do filme do app, que exige login. Uma página pública é decisão de produto maior e mudaria a proteção das rotas |
| Outros canais além da Web Share e do WhatsApp (SMS, e-mail, copiar o link) | No celular, a folha de compartilhamento do aparelho já cobre todos; no computador, o WhatsApp é o canal mais provável para "quem vai assistir". Sem pedido do cliente, não adicionamos mais |
| Compartilhar antes de escolher (as 3 opções para a outra pessoa votar) | É a "Noite a dois" (pedido 3.6, issue #9) |
| Compartilhar séries | Fica para a spec de séries no wizard (`series-noite`) |
