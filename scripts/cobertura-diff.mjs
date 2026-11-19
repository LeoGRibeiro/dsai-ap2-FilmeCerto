// Cobertura das linhas novas (critério da AP2: pelo menos 70% do código novo coberto).
// Uso, depois de `pnpm test:coverage`: pnpm coverage:diff <base> [<base> ...]
// Ex.: pnpm coverage:diff origin/main 4ac8b98   (este PR / toda a AP2)
// No GitHub Actions, também escreve no resumo do job e avisa abaixo do mínimo, sem reprovar.
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";

import { executar } from "./lib/cobertura-diff.mjs";

const { GITHUB_ACTIONS, GITHUB_STEP_SUMMARY } = process.env;

// Sem contexto, com prefixos fixos e caminhos sem escape, qualquer que seja o .gitconfig.
const GIT_DIFF = [
  "-c",
  "core.quotePath=false",
  "diff",
  "--unified=0",
  "--no-color",
  "--no-ext-diff",
];
const PREFIXOS = ["--src-prefix=a/", "--dst-prefix=b/"];

process.exitCode = executar(process.argv.slice(2), {
  lerLcov: () => readFileSync("coverage/lcov.info", "utf8"),
  diff: (base, arquivos) =>
    execFileSync("git", [...GIT_DIFF, ...PREFIXOS, `${base}...HEAD`, "--", ...arquivos], {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
    }),
  escrever: (texto) => process.stdout.write(texto),
  erro: (texto) => process.stderr.write(texto),
  resumo: GITHUB_STEP_SUMMARY ? (texto) => appendFileSync(GITHUB_STEP_SUMMARY, texto) : undefined,
  avisar:
    GITHUB_ACTIONS === "true"
      ? (mensagem) => console.log(`::warning title=Cobertura das linhas novas::${mensagem}`)
      : undefined,
});
