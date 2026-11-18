// Cobertura das linhas novas: cruza o `lcov.info` do `pnpm test:coverage` com o `git diff`
// contra uma base. Só lógica pura; a leitura de arquivos e o git ficam em scripts/cobertura-diff.mjs.

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
