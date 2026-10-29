<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Diretrizes da AP2 — Filme Certo (Desenvolvimento de Software Apoiado por IA - UFPA)

Este repositório é a continuidade (AP2) do projeto legado **Filme Certo**.
Qualquer agente de IA que atue neste projeto DEVE seguir rigorosamente as regras e métricas de processo, qualidade e restrições da disciplina, pois **tudo é auditado automaticamente por scripts**. O que não está no repositório de acordo com as regras não aconteceu ou zera o critério.

---

## 1. Restrições Inegociáveis (Eliminatórias / Nota Zero)

1. **Sem reescrita de projeto:**
   - Proibido trocar a linguagem (TypeScript), o framework (Next.js 16 App Router) ou a stack base (Tailwind, Supabase, TMDB).
   - Proibido apagar módulos inteiros para refazer do zero ou abrir outro repositório.
   - Refatorações devem ser estritamente localizadas, justificadas em issues e 100% cobertas por testes.
2. **Histórico sem reescrita:**
   - **NUNCA** fazer `git push --force` na branch `main`.
   - **NUNCA** fazer commit direto na branch `main`. Todo trabalho deve ser feito em branches de funcionalidade (`feat/...`, `fix/...`, `docs/...`) e integrado na `main` exclusivamente via Pull Request aprovado.
3. **Autoria e clientes:**
   - Os autores originais da AP1 (Alexsandro Costa e Jonathan Fagundes) são clientes/stakeholders e NÃO escrevem código na AP2. Commits de autores originais no fork não contam.
   - Os commits da AP2 devem ser distribuídos de forma equilibrada entre os integrantes da nova dupla (mínimo de 30% dos commits para cada um).

---

## 2. Fluxo Obrigatório de Trabalho para Toda Funcionalidade

Para **qualquer** funcionalidade ou alteração no sistema, a ordem cronológica de commits no Git DEVE ser respeitada:

### Passo 1: Spec Primeiro (`SPEC/`)
- Crie um arquivo markdown datado em `SPEC/` seguindo o padrão do projeto:
  `SPEC/YYYY-MM-DD-<slug-da-funcionalidade>.md`
- A spec deve detalhar: *O quê*, *Por quê*, *Decisões técnicas*, *Critérios de aceitação testáveis* e *Fora do escopo*.
- **REGRA CRÍTICA:** A spec DEVE ser commitada no Git **antes** do primeiro commit de código que a implementa ou cita.

### Passo 2: Implementação com Testes
- Código novo deve nascer acompanhado de testes unitários (`tests/unit/`), de integração (`tests/integration/`) e/ou ponta a ponta (`tests/e2e/`).
- Meta de cobertura: **≥ 70% de diff coverage** (cobertura de linhas do código novo).
- Testes devem ser reais ("testes que testam": se a mudança for revertida, o teste correspondente deve falhar).
- Proibida a geração de código duplicado (máximo tolerado no projeto: 5% medido com `jscpd`).
- Proibido código morto ou gerado em massa apenas para inflar contagem de linhas.

### Passo 3: Commits Pequenos e com Metadados Obrigatórios
- **Tamanho dos commits:** Frequência de pelo menos 2 dias por semana; **tamanho mediano do commit < 400 linhas**. Evite commits gigantescos.
- **Trailers obrigatórios em pelo menos 80% dos commits:**
  Todo commit de agente DEVE incluir no final da mensagem os trailers `Agent:` e `Spec:`.
  Exemplo:
  ```gitcommit
  feat(estatisticas): adiciona cálculo de tempo total assistido

  Calcula o total em minutos e horas com base nos filmes da lista
  de assistidos e na duração obtida do TMDB.

  Agent: antigravity/gemini-3-8-flash
  Spec: SPEC/2026-10-29-estatisticas-cinfilo.md
  ```

### Passo 4: Registro da Sessão de IA (`prompts/sessoes/`)
- **100% dos dias com commits de agente** devem ter um arquivo de registro de sessão correspondente em `prompts/sessoes/YYYY-MM-DD-HHMM-<nome-agente>.jsonl`.
- **Custo ou tokens registrados:** Toda sessão DEVE registrar o consumo de tokens e/ou custo financeiro estimado.

---

## 3. Segurança e Segredos
- **Zero tolerância a segredos no repositório:**
  - Nenhuma chave de API real, token de serviço ou senha pode ser commitada no Git (auditado com `gitleaks` e `pnpm check:secrets`).
  - Mantenha `.env.local` estritamente ignorado no `.gitignore`. Use apenas `.env.example` para documentar novas variáveis.
- Sempre preserve e respeite as políticas de RLS (Row Level Security) do Supabase em qualquer tabela nova criada via migration em `supabase/migrations/`.

---

## 4. Portões de Qualidade e CI Local
Antes de submeter qualquer branch ou abrir PR, os seguintes comandos devem rodar limpos e sair com código 0:
```bash
pnpm lint          # Sem avisos ou erros de lint
pnpm typecheck     # tsc --noEmit sem erros
pnpm test          # Suíte unitária 100% verde
pnpm check:secrets # Sem vazamento de variáveis privadas para o bundle
```
O CI no GitHub Actions (`.github/workflows/ci.yml`) deve permanecer verde no último commit da `main` em 100% do tempo.
