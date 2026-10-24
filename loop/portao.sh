#!/usr/bin/env bash
# Portão do loop da aula 7: decide, sem opinião, se a rodada passou.
# Uso: bash loop/portao.sh baseline   (antes da 1ª rodada)
#      bash loop/portao.sh            (depois de cada rodada)
# Saída na última linha: PASSOU, FALHOU <motivo> ou ESCALAR <motivo>.
set -u
export LC_ALL=C
cd "$(dirname "$0")/.."

BASE=loop/.baseline
TESTE=tests/unit/features/mcp/provedores.test.ts
# Única área que o agente pode mexer.
PERMITIDO='^(src/features/mcp/|tests/unit/features/mcp/)'

# Arquivos alterados ou novos em relação ao HEAD, com hash do conteúdo.
estado() {
  git status --porcelain --untracked-files=all | cut -c4- | grep -v '^loop/' | while read -r f; do
    if [ -f "$f" ]; then echo "$(git hash-object "$f") $f"; else echo "apagado $f"; fi
  done | sort
}

if [ "${1:-}" = baseline ]; then
  estado > "$BASE"
  echo "baseline gravada: $(wc -l < "$BASE") arquivos já alterados"
  exit 0
fi

[ -f "$BASE" ] || { echo "ESCALAR sem baseline"; exit 2; }

# 1. Zona proibida: tudo que mudou desde a baseline precisa estar na área permitida,
#    e o teste de aceitação não pode mudar.
mudou=$(comm -13 "$BASE" <(estado) | cut -d' ' -f2-)
fora=$(echo "$mudou" | grep -v '^$' | grep -Ev "$PERMITIDO")
if echo "$mudou" | grep -qx "$TESTE"; then echo "ESCALAR teste de aceitação alterado"; exit 2; fi
if [ -n "$fora" ]; then echo "ESCALAR zona proibida: $(echo $fora)"; exit 2; fi
[ -n "$mudou" ] || { echo "FALHOU nenhum arquivo alterado"; exit 1; }

# 2. Critério de parada: os quatro comandos saem com 0.
for cmd in "pnpm exec vitest run --project unit $TESTE" "pnpm test" "pnpm typecheck" "pnpm lint"; do
  if ! $cmd > loop/.ultimo.log 2>&1; then
    echo "FALHOU $cmd"
    exit 1
  fi
done
echo "PASSOU"
