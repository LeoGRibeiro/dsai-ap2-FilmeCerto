# Pedido do cliente para a AP2: Filme Certo

> Transcrição fiel do documento entregue pelos clientes (Alexsandro Costa e Jonathan Fagundes, autores da AP1). Só a formatação foi ajustada para Markdown. É a fonte dos requisitos da AP2: toda spec nova deve apontar para a seção daqui que ela atende.

## 1. A visão: o norte de qualquer mudança

O Filme Certo não é um catálogo de streaming. Já existem muitos apps que mostram centenas de pôsteres em carrosséis infinitos. O problema que queremos resolver é outro:

> "O que eu vejo hoje à noite?"

A pessoa abre o app cansada, com 20 minutos de paciência, e quer sair com uma decisão, não com mais opções. Toda funcionalidade nova deve passar por este filtro:

> **Ajuda a decidir mais rápido?** Então serve.
> **Só mostra mais filmes?** Então não serve.

### O que não queremos

- Catálogo infinito, rolagem sem fim, mais carrosséis no dashboard.
- Respostas do wizard da noite virando preferência permanente.
- Gamificação (pontos, sequência de noites, medalhas). O app deve resolver e sair da frente.
- Reescrita de módulos. O que já funciona fica; evoluam por cima.

## 2. O que já existe (para vocês se localizarem)

| Área | Onde olhar | Observação |
|---|---|---|
| Onboarding (7 passos, grava preferências) | `SPEC/2026-10-06-onboarding-assertivo.md`, `src/features/preferencias/` | Gêneros favoritos, gêneros evitados, streamings, filmes amados |
| Motor de recomendação por seções | `SPEC/2026-10-05-motor-recomendacao.md`, `src/features/recomendacao/` | Sem IA, regras e pesos |
| Reações "Não é pra mim / Gostei / Amei" | `SPEC/2026-10-05-reacoes.md`, `src/features/reacoes/` | Uma reação por filme; alimenta o motor |
| Listas "Quero assistir / Já assisti" | `SPEC/2026-10-05-listas.md`, `src/features/listas/` | |
| "Me surpreenda" (globo) | `SPEC/2026-10-05-me-surpreenda.md`, `src/features/surpresa/` | Bom exemplo de sorteio sem repetição |
| Página do filme (com trailer) | `src/app/(app)/filme/[id]/`, `src/features/filme/components/trailer.tsx` | O trailer já existe; reaproveitem |
| Cliente TMDB | `src/lib/tmdb/` | Só filmes (`/discover/movie`, `/movie/{id}`) |
| Servidor MCP | `SPEC/2026-10-13-mcp.md`, `src/features/mcp/` | Fora do escopo desta AP2 |

## 3. O que pedimos

Estão em ordem de prioridade. Cada uma entrega valor sozinha, então, se o tempo acabar no meio, o que já foi feito continua útil.

### 3.1 Métricas de uso (fazer primeiro)

**O quê:** registrar eventos simples de uso das funcionalidades novas e das principais que já existem.

**Por quê:** a AP2 pede evidência de uso, e nós também queremos saber se o wizard é usado e se as pessoas chegam até o fim. Sem medir, ninguém consegue responder.

**Eventos mínimos:**

- `wizard_iniciado`, `wizard_concluido` (chegou ao resultado), `wizard_troca` (com o motivo), `wizard_escolheu` ("Vou ver esse!"), `wizard_abandonado` (opcional, se der para detectar).
- `como_foi_exibido`, `como_foi_respondido` (com a resposta).
- `trailer_aberto` (onde foi aberto).

**Regras:**

- Sem dados pessoais além do `usuario_id`.
- Nunca gravar as respostas de humor do wizard junto ao usuário. Se quiserem contar quais climas são mais escolhidos, contem sem vincular a pessoa.
- Uma consulta SQL (ou uma página simples só para a dupla) que mostre os totais. Isso vira a evidência de vocês.

**Sugestão técnica:** uma tabela `public.eventos` (`usuario_id`, `nome`, `dados jsonb`, `criado_em`) com RLS só de insert para `authenticated`.

### 3.2 Wizard "O que ver hoje?" (a principal)

**O quê:** um botão de destaque no dashboard abre um wizard curto. Ele faz algumas perguntas sobre esta noite e devolve uma recomendação.

**Por quê:** as preferências do onboarding dizem do que a pessoa gosta em geral. Mas hoje ela pode estar cansada, triste ou com os filhos no sofá. O wizard ajusta a recomendação ao momento sem mexer no perfil.

#### Perguntas (uma por tela, com "Voltar")

1. **Filme ou série?** (a opção "Série" só entra quando a seção 3.5 estiver pronta; até lá, o wizard é só de filmes e esta tela não aparece)
2. **Como você está se sentindo?** Ex.: cansado, animado, pra baixo, nostálgico, ansioso, de boa.
3. **Que tipo de experiência você quer?** Ex.: rir, me emocionar, levar susto, ficar tenso, pensar, só me distrair.
4. **Com quem vai assistir?** Sozinho, a dois, família com crianças, amigos.

Cada resposta é um clique em cartões grandes, nada de digitar. O wizard inteiro tem que levar menos de 30 segundos.

#### Regras de recomendação

- **Nada é salvo como preferência.** As respostas valem só para esta sessão do wizard (estado da página ou da URL).
- **O perfil é só lido:**
  - nunca recomendar o que está em "Já assisti" ou marcado como "Não é pra mim";
  - respeitar os gêneros evitados;
  - dar prioridade ao que está nos streamings da pessoa (e dizer onde assistir).
- **O clima e a experiência mandam mais que os gêneros favoritos.** Quem ama terror mas está "pra baixo e quer rir" recebe comédia.
- **"Família com crianças"** precisa respeitar a classificação etária.
- **Piso de qualidade:** nada com nota baixa ou com poucos votos.

O mapeamento entre respostas e filtros (qual clima vira quais gêneros, tom e classificação) é decisão de vocês. Coloquem esse mapeamento como **tabela na spec**, para que possamos revisar.

**Sugestão técnica:** o `descobrirFilmes` (`src/lib/tmdb/filmes.ts`) já filtra por gêneros, gêneros excluídos, provedores, duração, nota e votos. Falta filtrar por classificação etária (`certification_country=BR` + `certification.lte`) e, talvez, por palavras-chave (`with_keywords`) para o tom. Estendam `FiltrosDescoberta` em vez de criar um cliente novo.

#### Tela de resultado

1. Primeiro aparece **uma única recomendação**, em destaque: pôster, título, ano, duração, onde assistir, botão "Ver trailer" e um **motivo ligado às respostas**. Ex.: *"Você está cansado, quer rir e vai ver a dois: comédia leve, nota 7,8, está na Netflix."*
2. Também mostra **"Começando agora, termina às 23h40"** (hora atual + duração). Não é uma pergunta, é só uma informação para ajudar a decidir.
3. Dois botões:
   - **"Vou ver esse!"**: fecha a noite (ver 3.3).
   - **"Esse não"**: pede o porquê numa escolha rápida (Já vi / Não é o clima / Muito longo / Outro) e então mostra uma nova recomendação em destaque e **mais 2 opções menores** abaixo. A partir daí, a tela tem 3 opções.
4. "Já vi" deve tirar o filme das próximas sugestões do wizard. Se fizer sentido, ofereçam marcar como "Já assisti".
5. "Não é o clima" e "Muito longo" ajustam a próxima rodada (outro tom, filme mais curto).
6. Há um **limite de trocas** (sugestão: 5). Ao atingir o limite, o app oferece refazer as perguntas, em vez de virar uma lista infinita.
7. Nunca repetir um filme já mostrado na mesma sessão do wizard.

```
O FILME DA SUA NOITE
+-----------+
|  pôster   |  Título (2019) · 1h52
|           |  "Você está cansado, quer rir
+-----------+   e vai ver a dois: comédia leve"
                Na Netflix · termina às 23h40
                [ Ver trailer ]

[ Vou ver esse! ]     [ Esse não ]

--- depois de "Esse não" ---

+-----------+  Ou talvez:
|   nova    |  [pôster] Opção 2
| sugestão  |  [pôster] Opção 3
+-----------+
trocas restantes: 4
```

#### Critérios de pronto (vistos pelo usuário)

- Do dashboard até a primeira recomendação: no máximo 4 cliques.
- Nenhuma resposta do wizard aparece depois no `/perfil` nem muda o dashboard.
- Nunca aparece um filme já assistido, marcado "Não é pra mim" ou de gênero evitado.
- "Família com crianças" nunca traz filme com classificação acima do limite que vocês definirem.
- O motivo exibido condiz com as respostas dadas.
- Funciona bem no celular (é ali que a pessoa decide, no sofá).

### 3.3 "Como foi?"

**O quê:** quando a pessoa clica "Vou ver esse!", o app guarda só a escolha (título, tipo e data). Na próxima visita, ele pergunta:

> *Como foi {título}?* [Amei] [Gostei] [Não é pra mim] [Não cheguei a ver]

**Por quê:** fecha o ciclo. A noite vira reação, a reação alimenta o motor e o app aprende sem pedir esforço. Hoje quase ninguém volta para marcar reação por conta própria.

**Regras:**

- Responder grava a reação (o fluxo de `src/features/reacoes/` já existe) e marca o título como "Já assisti".
- "Não cheguei a ver" descarta a pergunta sem gravar nada.
- A pergunta aparece uma vez. Se a pessoa fechar sem responder, perguntar de novo no máximo mais uma vez. Depois disso, desistir.
- Gravar só o título escolhido, nunca as respostas do wizard.
- Se a pessoa escolher vários títulos em noites seguidas sem responder, perguntar só do mais recente.

**Sugestão técnica:** uma tabela `public.escolhas_noite` (`usuario_id`, `tipo`, `tmdb_id`, `escolhido_em`, `respondido_em`, `vezes_perguntado`) com RLS por `usuario_id`.

### 3.4 Trailer e "termina às" no resultado

Já estão descritos em 3.2. Estão separados aqui só para lembrar que são pequenos e podem ser feitos à parte. O componente de trailer já existe em `src/features/filme/components/trailer.tsx`, e a duração já vem em `FilmeDetalhes.duracaoMin`.

### 3.5 Suporte completo a séries

**O quê:** séries passam a ser cidadãs do app, como os filmes:

- opção "Série" no wizard (pergunta 1);
- página de detalhes da série (`/serie/[id]`): sinopse, temporadas, duração média do episódio, elenco, onde assistir, trailer;
- reações e listas aceitam séries;
- o "Como foi?" funciona para séries também.

**Por quê:** à noite, muita gente quer "um episódio de alguma coisa", não um filme de 2 horas.

**Atenção, risco técnico:** no TMDB, filme e série têm sequências de ID independentes, então o mesmo número pode ser um filme e uma série diferentes. Hoje `reacoes` e `lista_itens` usam a chave `(usuario_id, tmdb_id)`. Será preciso:

- adicionar uma coluna `tipo` (`filme` | `serie`) com padrão `filme`, para que todos os dados atuais continuem válidos;
- trocar a chave para `(usuario_id, tipo, tmdb_id)`;
- fazer isso numa **migration nova**, sem apagar nem recriar as tabelas (o banco de produção tem dados reais);
- revisar tudo o que lê essas tabelas: motor, dashboard, "Me surpreenda", listas, MCP. Onde só se espera filme, filtrar `tipo = 'filme'`.

Os gêneros de série no TMDB também são outra lista (`/genre/tv/list`), com IDs diferentes dos de filme.

**Fora do escopo agora:** seções de série no dashboard, séries no motor de recomendação, no "Me surpreenda", na busca e no MCP.

### 3.6 "Noite a dois" (para depois)

**O quê:** uma pessoa abre o wizard, toca em "Vamos escolher juntos" e manda um link. Cada um responde as perguntas no próprio celular, e o app sugere algo que agrade aos dois, com um motivo do tipo "ela quer rir, você quer tensão: comédia de ação".

**Por quê:** o maior conflito da noite não é "o que eu vejo", é "o que a gente vê".

Não cabe nos 4 dias. Fica registrada para quem continuar.
