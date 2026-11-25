# Spec: Convite da "Noite a dois" para quem ainda não tem conta

- **Data:** 2026-11-25
- **Componente:** auth (destino `next` levado por login, cadastro e onboarding)
- **Status:** aprovada para implementação
- **Substitui:** nenhuma. Ajusta o fluxo de [2026-10-02-auth.md](2026-10-02-auth.md) (o cadastro levava sempre a `/onboarding`) e de [2026-10-06-onboarding-assertivo.md](2026-10-06-onboarding-assertivo.md) (o onboarding levava sempre a `/dashboard`)
- **Issue:** #51

## O quê

Quem recebe o link de uma sala da "Noite a dois" (`/noite/juntos/{sala}`) e ainda não tem conta passa a voltar **para a sala** depois de criar a conta e fazer o onboarding. Hoje a pessoa termina no `/dashboard` e precisa voltar ao WhatsApp para tocar no link de novo.

O destino que o proxy guarda em `/login?next=<rota>` passa a sobreviver ao caminho inteiro:

```
/noite/juntos/{sala}
  → /login?next=/noite/juntos/{sala}         (proxy, como hoje)
  → /cadastro?next=/noite/juntos/{sala}      (link "Criar conta")
  → /onboarding?next=/noite/juntos/{sala}    (action cadastrar)
  → /noite/juntos/{sala}                     (action salvarPreferencias)
```

O link de volta **"Entrar"** do cadastro também leva o `next`, para quem tocou em "Criar conta" por engano e já tem conta. Sem `next`, nada muda: o cadastro leva a `/onboarding` e o onboarding a `/dashboard`.

## Por quê

A [seção 3.6 do pedido do cliente](../docs/ap2/pedido-do-cliente.md#36-noite-a-dois-para-depois) é sobre decidir **a dois**: "o maior conflito da noite não é 'o que eu vejo', é 'o que a gente vê'". A [spec da "Noite a dois"](2026-11-18-noite-a-dois.md) entrega isso com um link mandado pelo WhatsApp, e a segunda pessoa é justamente quem tem mais chance de ainda não ter conta. Perder a sala no cadastro quebra o convite no primeiro uso: as duas pessoas estão no sofá esperando, e a convidada cai num dashboard que não tem nada a ver com a noite. Isso vai contra o filtro do cliente (ajudar a decidir mais rápido).

## Decisões técnicas

| Tema | Decisão |
|---|---|
| Validação do destino | Todo `next`, em qualquer página ou action, passa por `sanitizarNext` (`src/features/auth/redirecionamento.ts`), como já faz o login. Um valor inválido vira `/dashboard`, então não há open redirect novo |
| Montar as URLs | Função pura nova `caminhoComNext(caminho, destino)` no mesmo arquivo: devolve o caminho puro quando o destino é o padrão (`/dashboard`) e `caminho?next=<destino codificado>` nos outros casos. Assim os links e redirecionamentos de hoje continuam iguais para quem não veio de um convite |
| Login → cadastro | `LoginForm` já recebe o `next` sanitizado da página; o link "Criar conta" passa a apontar para `caminhoComNext("/cadastro", next)` |
| Cadastro | A página `/cadastro` lê `?next=`, sanitiza e passa ao `CadastroForm`, que manda o valor num campo oculto (como o login) e usa `caminhoComNext("/login", next)` no link "Entrar" |
| Cadastro → onboarding | A action `cadastrar` redireciona para `caminhoComNext("/onboarding", sanitizarNext(next))`, ainda por `redirecionarComSessaoNova` (limpa o cache do roteador antes do `redirect`) |
| Onboarding | A página `/onboarding` lê `?next=`, sanitiza e passa ao `OnboardingWizard`, que o manda num campo oculto. Quem já tem preferências e abre `/onboarding?next=...` vai direto ao destino |
| Onboarding → destino | `salvarPreferencias` redireciona para `sanitizarNext(next)`, mantendo o `revalidatePath("/", "layout")` antes do `redirect`. Se a sessão caiu, o login de volta guarda `/onboarding` com o destino |
| Layout de `(app)` | Continua mandando para `/onboarding` sem `next` quem tem conta e não tem preferências (ver "Fora do escopo") |

## Critérios de aceitação

1. `caminhoComNext` devolve `/cadastro` para o destino padrão e `/cadastro?next=%2Fnoite%2Fjuntos%2Fabc` para `/noite/juntos/abc`, e preserva a query do destino codificada (`/busca?q=a&b=1`). Teste: `tests/unit/features/auth/redirecionamento.test.ts`.
2. O link "Criar conta" do login aponta para `/cadastro?next=<destino>` quando há `next` e para `/cadastro` quando não há. Teste: `tests/unit/features/auth/login-form.test.tsx`.
3. O cadastro envia o `next` recebido no formulário, e o link "Entrar" aponta para `/login?next=<destino>` (ou `/login` sem destino). Teste: `tests/unit/features/auth/cadastro-form.test.tsx`.
4. A página `/cadastro` passa adiante só um `next` sanitizado: `?next=//evil.com` não aparece no formulário nem nos links. Teste: `tests/unit/app/cadastro-page.test.tsx`.
5. `cadastrar` com `next=/noite/juntos/abc` limpa o cache do roteador e redireciona para `/onboarding?next=%2Fnoite%2Fjuntos%2Fabc`; sem `next` ou com `next=https://evil.com`, para `/onboarding`. Teste: `tests/unit/features/auth/actions.test.ts`.
6. `salvarPreferencias` com `next=/noite/juntos/abc` limpa o cache do roteador e só depois redireciona para `/noite/juntos/abc`; sem `next` ou com `next=//evil.com`, para `/dashboard`. Teste: `tests/unit/features/preferencias/actions.test.ts`.
7. O wizard do onboarding envia o `next` que recebeu junto com as respostas. Teste: `tests/unit/features/preferencias/wizard.test.tsx`.
8. A página `/onboarding` de quem já tem preferências redireciona para o `next` sanitizado (ou `/dashboard`). Teste: `tests/unit/app/onboarding-page.test.tsx`.
9. **E2E:** uma pessoa cria a sala; outra, sem conta, abre o link, vai ao login, toca em "Criar conta", cadastra, faz o onboarding, cai na sala, responde e as duas veem a mesma sugestão. Teste: `tests/e2e/noite-a-dois.spec.ts`.
10. Os E2E de cadastro e onboarding sem `next` continuam passando (cadastro → `/onboarding` → `/dashboard`).

## Fora do escopo

- **Destino no layout de `(app)`.** Quem já tem conta mas abandonou o onboarding e depois abre o link da sala continua indo a `/onboarding` sem `next`, e termina no `/dashboard`. A documentação do Next.js 16 diz que layouts não recebem o caminho atual porque não são renderizados de novo a cada navegação (o valor ficaria velho). Levar o caminho exigiria um cabeçalho injetado pelo proxy dentro de `updateSession`, que é o código que renova a sessão e não deve ganhar lógica nova sem necessidade. O caso é raro (a conta fica sem preferências só se a pessoa fechar o wizard no meio) e o fluxo principal do convite, cadastro novo, fica coberto.
- **Pessoa já logada em `/login?next=...` ou `/cadastro?next=...`.** O proxy continua mandando para `/dashboard`, como na spec de auth. Quem já tem sessão abre o link da sala direto, sem passar pelo login.
- Login social e recuperação de senha (continuam fora, como na spec de auth).
