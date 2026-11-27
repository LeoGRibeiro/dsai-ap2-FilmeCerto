# Spec: Avisos de episódio novo no início

- **Data:** 2026-11-25
- **Componente:** Séries / Início (dashboard) / Supabase
- **Status:** aprovada para implementação
- **Substitui:** a decisão "Verificação periódica" e o critério 10 de [2026-11-24-aviso-episodio-novo.md](2026-11-24-aviso-episodio-novo.md). O resto daquela spec continua valendo; esta completa o que ela deixou sem fazer (gerar e mostrar os avisos)
- **Issue:** #52 (continua a #45)

## O quê

O PR #46 criou o botão "Avisar sobre novos episódios" e as tabelas `acompanhamentos_series` e `avisos_episodios`, mas nada gera nem mostra avisos. Esta spec fecha o ciclo:

1. **Geração sob demanda.** Quando a pessoa abre o início (`/dashboard`), o app lê no TMDB os detalhes de cada série que ela acompanha (as 20 mais recentes) e grava em `avisos_episodios`:
   - o **próximo episódio** com data (`next_episode_to_air`), para a data ficar guardada e atualizada antes da estreia;
   - o **último episódio exibido** (`last_episode_to_air`), só quando ele foi ao ar **no dia em que a pessoa começou a acompanhar ou depois** (`acompanhamentos_series.criado_em`, no dia de São Paulo). Assim quem só volta ao app depois da estreia também é avisado, e quem acaba de acompanhar uma série antiga não recebe aviso de um episódio de anos atrás.
2. **Cartão no início.** Um cartão curto, no mesmo lugar do "Como foi?", com até 3 avisos **não lidos** de episódios que **já estrearam** (data até hoje em São Paulo), os mais recentes primeiro:
   - "Saiu o episódio 8 da temporada 2 de Ruptura";
   - "Estreou em 25/11/2026";
   - link "Ver temporada 2" para `/serie/{id}/temporada/{n}`;
   - botão "Marcar como lido", que preenche `lido_em` e tira o aviso do cartão.
   Sem aviso, o cartão não aparece. Ele fica no próprio `Suspense` e não atrasa o resto do início.
3. **Deixar de acompanhar apaga os avisos** daquela série, para eles não continuarem aparecendo.
4. **Filtro por idade:** com o filtro ligado, aviso de série bloqueada (+18) não aparece, como no "Como foi?" ([2026-11-23-filtro-idade.md](2026-11-23-filtro-idade.md)).

### Quais episódios viram aviso

| Situação no TMDB | Grava? | Aparece no cartão? |
|---|---|---|
| `next_episode_to_air` com data futura | Sim | Não, até a data chegar |
| `next_episode_to_air` com data de hoje ou passada (TMDB atrasado) | Sim | Sim |
| `last_episode_to_air` com data a partir do dia em que a pessoa começou a acompanhar | Sim | Sim |
| `last_episode_to_air` com data anterior a esse dia | Não | — |
| Episódio sem data, sem número de temporada ou de episódio | Não | — |
| Episódio da temporada 0 (especiais) | Não | — |
| Data do episódio mudou no TMDB | Atualiza o mesmo aviso | Conforme a nova data |
| TMDB fora do ar ou série que virou 404 | Nada daquela série | Os avisos já gravados continuam |

## Por quê

- [Pedido do cliente, seção 3.5](../docs/ap2/pedido-do-cliente.md#35-suporte-completo-a-séries): séries são cidadãs do app, e "à noite, muita gente quer um episódio de alguma coisa". Saber que saiu o episódio da série que a pessoa acompanha é a decisão mais rápida possível: ela já sabe o que ver.
- Issue #52: o PR #46 deixou a gravação de avisos e a tela por fazer, e a spec anterior deixou a "verificação periódica" em aberto.
- **Filtro do cliente** ("ajuda a decidir mais rápido?"): por isso é um cartão de poucas linhas, e não um carrossel ou uma seção nova de catálogo.

## Decisões técnicas

| Decisão | Abordagem |
|---|---|
| Verificação periódica | **Substituída pela geração sob demanda** ao abrir o início. Sem cron e sem chave de serviço: a gravação usa a sessão da própria pessoa, sob RLS. Quem não abre o app não precisa do aviso, porque o canal é só dentro do app |
| Custo no TMDB | `obterSerie` já tem cache de 24 h (`revalidate`), o mesmo da página da série. Limite de 20 séries por visita, as acompanhadas mais recentemente |
| Esquema do TMDB | `last_episode_to_air` passa a ler os mesmos campos de `next_episode_to_air` (um esquema só para os dois). `SerieDetalhes` ganha `ultimoEpisodioDetalhes`, opcional como `proximoEpisodioDetalhes`. Sem cliente novo |
| Lógica pura | `episodiosParaAvisar(serie, desde)` em `src/features/serie/avisos.ts`: recebe os detalhes e o dia do acompanhamento e devolve as linhas a gravar. Sem banco nem TMDB |
| Dependências injetadas | `gerarAvisos(supabase, usuarioId, buscarSerie = obterSerie)`, no padrão de `definirReacao(..., buscarFilme)` |
| Duplicidade e data alterada | `upsert` pela chave única `(usuario_id, serie_tmdb_id, temporada_numero, episodio_numero)`. A nova data, o nome e o título substituem os antigos; `lido_em` não entra no `upsert` e fica como estava |
| Falhas | Falha do TMDB numa série: ela fica de fora e as outras seguem. Falha do banco: registra no log e o início abre sem o cartão. Nada lança para a página |
| Leitura | Até 10 avisos não lidos com `data_estreia <= hoje` (São Paulo, `diaEmSaoPaulo`), por `data_estreia` decrescente; o filtro por idade tira as séries bloqueadas e o cartão mostra os 3 primeiros |
| Marcar como lido | Server Action `marcarAvisoLido` (formulário, funciona sem JS) faz `update` de `lido_em` no aviso da pessoa e revalida `/dashboard` |
| Deixar de acompanhar | Apaga primeiro os avisos da série e depois o acompanhamento. Se o segundo passo falhar, a pessoa continua acompanhando e os avisos voltam na próxima visita |
| Especiais | A temporada 0 não gera aviso: a página `/serie/{id}/temporada/0` é 404 e os especiais raramente são o "próximo episódio" que a pessoa espera |
| `revalidatePath("/series")` | Rota inexistente; sai de `alternarAcompanhamento`, que passa a revalidar `/dashboard` |
| Wizard | Não muda |

## Banco de dados

Migration nova `supabase/migrations/20261125120000_avisos_episodios_politicas.sql`. A migration do PR #46 (`20261124145207_aviso_episodio_novo.sql`) já está na produção e não é editada.

- **Insert** em `avisos_episodios` para `authenticated`: só com `usuario_id = auth.uid()` **e** a série em `acompanhamentos_series` da própria pessoa. Ninguém cria aviso de série que não acompanha, nem para outra pessoa.
- **Delete** em `avisos_episodios` para `authenticated`: só os próprios.
- Comentários na tabela e nas colunas de `avisos_episodios` e `acompanhamentos_series`, que a migration anterior não tinha.

Os tipos (`database.types.ts`) não mudam: políticas e comentários não aparecem neles.

## Critérios de aceitação

1. Um episódio com data a partir do dia do acompanhamento vira aviso; um anterior, não (`tests/unit/features/serie/avisos.test.ts`).
2. Episódio sem data, sem número, da temporada 0 ou série sem episódio não geram aviso; o próximo e o último iguais geram um aviso só (`avisos.test.ts`).
3. `obterSerie` lê o último episódio com temporada, número, nome e data (`tests/unit/lib/tmdb/series.test.ts`), e o TMDB falso também (`tests/unit/lib/tmdb/tmdb-falso.test.ts`).
4. `gerarAvisos` grava com `upsert` pela chave única, sem `lido_em`; uma série com o TMDB fora do ar fica de fora sem impedir as outras; erro do banco não lança (`tests/unit/features/serie/gravar.test.ts`).
5. Deixar de acompanhar apaga os avisos da série antes do acompanhamento (`gravar.test.ts`).
6. A leitura traz só não lidos com estreia até hoje, mais recentes primeiro (`tests/unit/features/serie/consultas.test.ts` e `tests/integration/series/avisos.test.ts`).
7. `marcarAvisoLido` preenche `lido_em` só para a pessoa logada e revalida `/dashboard`; `alternarAcompanhamento` não revalida `/series` (`tests/unit/features/serie/actions.test.ts`).
8. O cartão mostra "Saiu o episódio N da temporada T de {série}", a data, o link para a temporada e "Marcar como lido"; sem avisos, não aparece; série bloqueada pelo filtro não aparece (`tests/unit/features/serie/avisos-episodios.test.tsx`).
9. RLS: a pessoa cria aviso só de série que acompanha e só para si, lê e apaga só os próprios; outra pessoa não lê, não marca como lido nem apaga; o `upsert` com data nova não duplica (`tests/integration/series/avisos.test.ts`).
10. E2E: acompanhar uma série do TMDB falso cujo último episódio estreou hoje mostra o aviso no início; "Marcar como lido" tira o aviso, e ele não volta ao recarregar (`tests/e2e/avisos-episodios.spec.ts`).

## Fora do escopo

- **Usar o episódio novo no wizard** ("O que ver hoje?" sugerir o episódio que acabou de sair): funcionalidade futura, com spec própria.
- Notificação por e-mail, push ou SMS, e verificação em segundo plano (cron) para quem não abre o app.
- Página com o histórico de avisos lidos.
- Avisar de mais de um episódio por série numa visita (temporada inteira lançada de uma vez): o TMDB informa só o último exibido e o próximo.
