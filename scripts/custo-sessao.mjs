// Linha de prompts/custos.md para uma sessão do Claude Code: soma o `message.usage` do `.jsonl`
// e dos subagentes (pasta `<sessão>/subagents/`, se existir), contando cada `message.id` uma vez.
// Uso: node scripts/custo-sessao.mjs <sessão.jsonl> [outros.jsonl ...] [--ferramenta "..."] [--custo "..."]
// Aceita também `.jsonl.gz` (sessões acima de 50 MB vão compactadas).
import { readdirSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

import { executar } from "./lib/custo-sessao.mjs";

process.exitCode = executar(process.argv.slice(2), {
  ler: (caminho) =>
    caminho.endsWith(".gz")
      ? gunzipSync(readFileSync(caminho)).toString("utf8")
      : readFileSync(caminho, "utf8"),
  listar: (pasta) => {
    try {
      return readdirSync(pasta);
    } catch {
      return [];
    }
  },
  escrever: (texto) => process.stdout.write(texto),
  erro: (texto) => process.stderr.write(texto),
});
