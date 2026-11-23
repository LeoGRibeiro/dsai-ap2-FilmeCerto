# Custos das sessões com agentes

Como os números foram obtidos:

- **Claude Code:** soma de `message.usage` das mensagens do assistente no `.jsonl` de cada sessão, contando cada `message.id` uma vez só (incluindo subagentes, se houver). O `node scripts/custo-sessao.mjs prompts/sessoes/<sessão>.jsonl` faz essa soma, inclui sozinho os `.jsonl` da pasta `<sessão>/subagents/` e imprime a linha da tabela (`--ferramenta` e `--custo` mudam as duas colunas de texto). A extensão do VS Code não tem `/cost`, então o custo fica como não disponível e os tokens cumprem o critério.
- **Antigravity:** os valores da linha `"type":"cost-state"` da própria exportação (`usage` e `modelUsage[...].costUSD`).

## AP2

| sessão | ferramenta | modelo | tokens entrada | tokens saída | cache (criação/leitura) | custo estimado |
|---|---|---|---:|---:|---:|---|
| [2026-10-28-2235-antigravity.jsonl](sessoes/2026-10-28-2235-antigravity.jsonl) | antigravity | gemini-3-8-flash | 784.124 | 18.501 | — / 3.577.710 | US$ 2,15 (informado pela ferramenta) |
| [2026-11-17-1455-claude-code.jsonl](sessoes/2026-11-17-1455-claude-code.jsonl) | claude-code (VS Code) | claude-opus-5-5 | 138 | 27.069 | 92.245 / 4.345.431 | não disponível (extensão VS Code) |
| [2026-11-18-1006-claude-code.jsonl](sessoes/2026-11-18-1006-claude-code.jsonl) | claude-code (VS Code) | claude-opus-5-5 | 108 | 49.573 | 127.407 / 6.290.156 | não disponível (extensão VS Code) |
| [2026-11-18-1037-claude-code.jsonl](sessoes/2026-11-18-1037-claude-code.jsonl) | claude-code (VS Code) | claude-opus-5-5 | 98 | 69.971 | 162.902 / 6.719.199 | não disponível (extensão VS Code) |
| [2026-11-18-1117-claude-code.jsonl](sessoes/2026-11-18-1117-claude-code.jsonl) | claude-code (VS Code) | claude-opus-5-5 | 122 | 65.266 | 162.175 / 8.654.754 | não disponível (extensão VS Code) |
| [2026-11-18-1920-claude-code.jsonl](sessoes/2026-11-18-1920-claude-code.jsonl) (+ 9 subagentes em [`2026-11-18-1920-claude-code/subagents/`](sessoes/2026-11-18-1920-claude-code/subagents/)) | claude-code (VS Code), orquestração | claude-opus-5-5 | 1.942 | 988.217 | 4.082.325 / 171.670.376 | não disponível (extensão VS Code) |
| [2026-11-19-1611-claude-code.jsonl](sessoes/2026-11-19-1611-claude-code.jsonl) (+ 3 subagentes em [`2026-11-19-1611-claude-code/subagents/`](sessoes/2026-11-19-1611-claude-code/subagents/)) | claude-code (VS Code), orquestração | claude-opus-5-5 | 388 | 157.549 | 508.813 / 19.161.744 | não disponível (extensão VS Code) |
| [2026-11-23-1512-claude-code.jsonl](sessoes/2026-11-23-1512-claude-code.jsonl) | claude-code (VS Code) | claude-opus-5-5 | 88 | 33.249 | 107.784 / 4.591.216 | não disponível (extensão VS Code) |
| [2026-11-23-1804-claude-code.jsonl](sessoes/2026-11-23-1804-claude-code.jsonl) | claude-code (VS Code) | claude-opus-5-5 | 478 | 140.771 | 336.126 / 47.337.887 | não disponível (extensão VS Code) |

## AP1 (sessões dos autores originais, herdadas com o fork)

| sessão | ferramenta | modelo | tokens entrada | tokens saída | cache (criação/leitura) | custo estimado |
|---|---|---|---:|---:|---:|---|
| [2026-10-02-1418-claude-code.jsonl](sessoes/2026-10-02-1418-claude-code.jsonl) | claude-code | claude-opus-5-5 | 172 | 57.388 | 136.730 / 9.485.604 | não registrado na exportação |
| [2026-10-02-1604-claude-code.jsonl](sessoes/2026-10-02-1604-claude-code.jsonl) | claude-code | claude-opus-5-5 | 720 | 444.411 | 1.464.481 / 134.394.158 | não registrado na exportação |
| [2026-10-05-2154-claude-code.jsonl](sessoes/2026-10-05-2154-claude-code.jsonl) | claude-code | claude-opus-5-5 | 320 | 127.719 | 306.873 / 29.741.029 | não registrado na exportação |
| [2026-10-06-1639-claude-code.jsonl](sessoes/2026-10-06-1639-claude-code.jsonl) | claude-code | claude-opus-5-5 | 182 | 74.129 | 218.753 / 15.114.369 | não registrado na exportação |
| [2026-10-13-1502-claude-code.jsonl](sessoes/2026-10-13-1502-claude-code.jsonl) | claude-code | claude-opus-5-5 | 216 | 151.119 | 650.112 / 27.482.369 | não registrado na exportação |
| [2026-10-23-2120-claude-code.jsonl](sessoes/2026-10-23-2120-claude-code.jsonl) | claude-code | claude-opus-5-5 | 52 | 20.173 | 138.383 / 1.902.185 | não registrado na exportação |
| [2026-10-23-2130-claude-code-loop-rodada1.jsonl](sessoes/2026-10-23-2130-claude-code-loop-rodada1.jsonl) | claude-code (`-p`, loop) | claude-sonnet-5-5 | 24 | 4.315 | 35.436 / 666.895 | não registrado na exportação |
