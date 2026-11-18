// Cobertura das linhas novas: cruza o `lcov.info` do `pnpm test:coverage` com o `git diff`
// contra uma base. Só lógica pura; a leitura de arquivos e o git ficam em scripts/cobertura-diff.mjs.

/** Mínimo da avaliação da AP2 para a cobertura do código novo, em %. */
export const COBERTURA_MINIMA = 70;

/** @typedef {Map<string, Map<number, number>>} Cobertura arquivo -> (linha -> execuções) */

/**
 * @typedef {object} ResultadoArquivo
 * @property {string} arquivo
 * @property {number} total linhas novas que o v8 instrumentou
 * @property {number} cobertas
 * @property {number[]} descobertas
 */

/**
 * @typedef {object} Resultado
 * @property {ResultadoArquivo[]} arquivos
 * @property {number} total
 * @property {number} cobertas
 * @property {number | null} percentual `null` quando não há linha nova medida
 */

/** @param {string} caminho */
function normalizarCaminho(caminho) {
  return caminho.trim().replaceAll("\\", "/").replace(/^\.\//, "");
}

/**
 * Lê um `lcov.info`: para cada arquivo (`SF:`), as linhas executáveis (`DA:linha,execuções`).
 * @param {string} texto
 * @returns {Cobertura}
 */
export function lerLcov(texto) {
  /** @type {Cobertura} */
  const cobertura = new Map();
  /** @type {Map<number, number> | null} */
  let atual = null;
  for (const linha of texto.split(/\r?\n/)) {
    if (linha.startsWith("SF:")) {
      const arquivo = normalizarCaminho(linha.slice(3));
      atual = cobertura.get(arquivo) ?? new Map();
      cobertura.set(arquivo, atual);
    } else if (linha.startsWith("DA:") && atual) {
      const [numero, execucoes] = linha.slice(3).split(",").map(Number);
      atual.set(numero, Math.max(atual.get(numero) ?? 0, execucoes));
    } else if (linha === "end_of_record") {
      atual = null;
    }
  }
  return cobertura;
}

/** @param {string} caminho */
function caminhoDoDiff(caminho) {
  const semAspas = caminho.startsWith('"') ? caminho.slice(1, -1) : caminho;
  return semAspas.replace(/^b\//, "");
}

/**
 * Lê a saída de `git diff --unified=0` e devolve as linhas adicionadas de cada arquivo, na
 * numeração do arquivo novo. Sem contexto, o lado `+` de cada trecho (`@@ -a,b +c,d @@`) são
 * exatamente as `d` linhas adicionadas a partir da `c`.
 * @param {string} diff
 * @returns {Map<string, Set<number>>}
 */
export function lerLinhasNovas(diff) {
  /** @type {Map<string, Set<number>>} */
  const arquivos = new Map();
  /** @type {Set<number> | null} */
  let atual = null;
  for (const linha of diff.split(/\r?\n/)) {
    if (linha.startsWith("+++ ")) {
      const caminho = linha.slice(4);
      // Arquivo apagado: não tem linha nova.
      atual = caminho === "/dev/null" ? null : new Set();
      if (atual) arquivos.set(caminhoDoDiff(caminho), atual);
      continue;
    }
    const trecho = /^@@ -\S+ \+(\d+)(?:,(\d+))? @@/.exec(linha);
    if (trecho && atual) {
      const inicio = Number(trecho[1]);
      const quantidade = trecho[2] === undefined ? 1 : Number(trecho[2]);
      for (let numero = inicio; numero < inicio + quantidade; numero++) atual.add(numero);
    }
  }
  return arquivos;
}

/**
 * Cruza as linhas novas com a cobertura. Só contam as linhas que o v8 instrumentou: comentários,
 * tipos e arquivos fora do `coverage.include` (testes, specs, configuração) ficam de fora.
 * @param {Cobertura} cobertura
 * @param {Map<string, Set<number>>} linhasNovas
 * @returns {Resultado}
 */
export function cruzarCobertura(cobertura, linhasNovas) {
  /** @type {ResultadoArquivo[]} */
  const arquivos = [];
  for (const [arquivo, novas] of linhasNovas) {
    const execucoes = cobertura.get(arquivo);
    if (!execucoes) continue;
    const medidas = [...novas].filter((numero) => execucoes.has(numero)).sort((a, b) => a - b);
    if (medidas.length === 0) continue;
    const descobertas = medidas.filter((numero) => execucoes.get(numero) === 0);
    arquivos.push({
      arquivo,
      total: medidas.length,
      cobertas: medidas.length - descobertas.length,
      descobertas,
    });
  }
  arquivos.sort((a, b) => a.arquivo.localeCompare(b.arquivo));
  const total = arquivos.reduce((soma, { total }) => soma + total, 0);
  const cobertas = arquivos.reduce((soma, { cobertas }) => soma + cobertas, 0);
  return { arquivos, total, cobertas, percentual: total === 0 ? null : (cobertas / total) * 100 };
}

/** @param {number} valor */
function formatarPercentual(valor) {
  return `${valor.toFixed(1).replace(".", ",")}%`;
}

/**
 * Agrupa números em ordem crescente em faixas: [3, 4, 5, 9] -> "3-5, 9".
 * @param {number[]} numeros
 */
export function agruparFaixas(numeros) {
  /** @type {string[]} */
  const faixas = [];
  let inicio = numeros[0];
  for (let i = 1; i <= numeros.length; i++) {
    if (numeros[i] === numeros[i - 1] + 1) continue;
    const fim = numeros[i - 1];
    faixas.push(inicio === fim ? `${inicio}` : `${inicio}-${fim}`);
    inicio = numeros[i];
  }
  return faixas.join(", ");
}

/**
 * Resumo em Markdown, para o terminal e para o resumo do job no GitHub Actions.
 * @param {Resultado} resultado
 * @param {string} base
 */
export function formatarResumo(resultado, base) {
  const titulo = `### Cobertura das linhas novas contra \`${base}\``;
  if (resultado.percentual === null) {
    return `${titulo}\n\nNenhuma linha nova de código medido (src/ e scripts/).\n`;
  }
  const situacao =
    resultado.percentual < COBERTURA_MINIMA
      ? `**Abaixo do mínimo de ${COBERTURA_MINIMA}%.**`
      : `Mínimo: ${COBERTURA_MINIMA}%.`;
  const linhas = resultado.arquivos.map(
    ({ arquivo, total, cobertas, descobertas }) =>
      `| \`${arquivo}\` | ${total} | ${cobertas} | ${formatarPercentual((cobertas / total) * 100)} | ${agruparFaixas(descobertas) || "—"} |`,
  );
  return [
    titulo,
    "",
    `**${formatarPercentual(resultado.percentual)}** das ${resultado.total} linhas novas medidas rodam nos testes unitários (${resultado.cobertas} cobertas). ${situacao}`,
    "",
    "| arquivo | linhas novas | cobertas | % | linhas sem teste |",
    "|---|---:|---:|---:|---|",
    ...linhas,
    "",
  ].join("\n");
}

/**
 * @typedef {object} Dependencias
 * @property {() => string} lerLcov conteúdo do `coverage/lcov.info`
 * @property {(base: string, arquivos: string[]) => string} diff `git diff --unified=0` de `base...HEAD`
 * @property {(texto: string) => void} escrever saída padrão
 * @property {(texto: string) => void} erro saída de erro
 * @property {((texto: string) => void) | undefined} [resumo] resumo do job no GitHub Actions
 * @property {((mensagem: string) => void) | undefined} [avisar] aviso no GitHub Actions
 */

/**
 * Mede a cobertura das linhas novas contra cada base. Nunca reprova: só avisa abaixo do mínimo,
 * porque a medição só enxerga os testes unitários. Devolve o código de saída.
 * @param {string[]} bases
 * @param {Dependencias} dependencias
 */
export function executar(bases, { lerLcov: lerArquivoLcov, diff, escrever, erro, resumo, avisar }) {
  if (bases.length === 0) {
    erro("Uso: pnpm coverage:diff <base> [<base> ...]\n");
    return 1;
  }
  let lcov;
  try {
    lcov = lerArquivoLcov();
  } catch {
    erro("coverage/lcov.info não encontrado. Rode `pnpm test:coverage` antes.\n");
    return 1;
  }
  const cobertura = lerLcov(lcov);
  for (const base of bases) {
    const resultado = cruzarCobertura(cobertura, lerLinhasNovas(diff(base, [...cobertura.keys()])));
    const texto = formatarResumo(resultado, base);
    escrever(`${texto}\n`);
    resumo?.(`${texto}\n`);
    if (resultado.percentual !== null && resultado.percentual < COBERTURA_MINIMA) {
      avisar?.(
        `Cobertura das linhas novas contra ${base}: ${formatarPercentual(resultado.percentual)} (mínimo: ${COBERTURA_MINIMA}%).`,
      );
    }
  }
  return 0;
}
