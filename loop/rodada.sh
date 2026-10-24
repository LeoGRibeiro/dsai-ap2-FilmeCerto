#!/usr/bin/env bash
# Roda uma rodada do loop numa sessão nova do Claude Code, sem conversa.
# Uso: bash loop/rodada.sh <número>
set -u
cd "$(dirname "$0")/.."
CLAUDE=${CLAUDE:-claude}
"$CLAUDE" -p "Leia loop/PROMPT.md e loop/ESTADO.md e execute a rodada $1 do loop." \
  --model claude-sonnet-5-5 \
  --permission-mode acceptEdits \
  --allowedTools "Read" "Edit" "Write" "Glob" "Grep" \
    "Bash(pnpm test*)" "Bash(pnpm typecheck*)" "Bash(pnpm lint*)" "Bash(pnpm exec vitest*)" \
    "Bash(bash loop/portao.sh)" "Bash(git diff*)" "Bash(git status*)" \
  --disallowedTools "Edit(tests/unit/features/mcp/provedores.test.ts)" "Write(tests/unit/features/mcp/provedores.test.ts)" \
    "Edit(loop/**)" "Write(loop/**)" "Edit(supabase/**)" "Write(supabase/**)" \
  --max-budget-usd 2 \
  --output-format json > "loop/rodada-$1.json"
echo "rodada $1 terminou com código $?"
bash loop/portao.sh
