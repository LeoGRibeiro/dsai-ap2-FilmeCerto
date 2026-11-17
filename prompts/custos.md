# Custos das sessões com agentes

Como os números foram obtidos:

- **Claude Code:** soma de `message.usage` das mensagens do assistente no `.jsonl` de cada sessão, contando cada `message.id` uma vez só (incluindo subagentes, se houver). A extensão do VS Code não tem `/cost`, então o custo fica como não disponível e os tokens cumprem o critério.
- **Antigravity:** os valores da linha `"type":"cost-state"` da própria exportação (`usage` e `modelUsage[...].costUSD`).

## AP2

| sessão | ferramenta | modelo | tokens entrada | tokens saída | cache (criação/leitura) | custo estimado |
|---|---|---|---:|---:|---:|---|
| [2026-10-28-2235-antigravity.jsonl](sessoes/2026-10-28-2235-antigravity.jsonl) | antigravity | gemini-3-8-flash | 784.124 | 18.501 | — / 3.577.710 | US$ 2,15 (informado pela ferramenta) |
| [2026-11-17-1455-claude-code.jsonl](sessoes/2026-11-17-1455-claude-code.jsonl) | claude-code (VS Code) | claude-opus-5-5 | 138 | 27.069 | 92.245 / 4.345.431 | não disponível (extensão VS Code) |

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
