# Custos das sessões com agentes

Tokens somados de `message.usage` das mensagens do assistente no `.jsonl` de cada sessão, contando cada `message.id` uma vez só (incluindo subagentes, se houver). A extensão do VS Code não tem `/cost`, então o custo fica como não disponível e os tokens cumprem o critério.

| sessão | ferramenta | modelo | tokens entrada | tokens saída | cache (criação/leitura) | custo estimado |
|---|---|---|---:|---:|---:|---|
| [2026-11-17-1455-claude-code.jsonl](sessoes/2026-11-17-1455-claude-code.jsonl) | claude-code (VS Code) | claude-opus-5-5 | 138 | 27.069 | 92.245 / 4.345.431 | não disponível (extensão VS Code) |
