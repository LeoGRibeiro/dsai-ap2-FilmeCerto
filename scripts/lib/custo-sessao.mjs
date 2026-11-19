// Tokens de uma sessão do Claude Code, na forma da tabela de prompts/custos.md.
// Só lógica pura; a leitura dos arquivos fica em scripts/custo-sessao.mjs.
import { parseArgs } from "node:util";

const FERRAMENTA_PADRAO = "claude-code (VS Code)";
const CUSTO_PADRAO = "não disponível (extensão VS Code)";

/**
 * @typedef {object} Uso
 * @property {number} entrada `input_tokens`
 * @property {number} saida `output_tokens`
 * @property {number} cacheCriacao `cache_creation_input_tokens`
 * @property {number} cacheLeitura `cache_read_input_tokens`
 * @property {string[]} modelos na ordem em que aparecem
 * @property {number} mensagens respostas distintas (`message.id`)
 * @property {number} linhasInvalidas linhas que não são JSON (ex.: a última, truncada)
 */

/**
 * Soma o `message.usage` das respostas do assistente, contando cada `message.id` uma vez: o
 * Claude Code grava uma linha por bloco da resposta, todas com o mesmo id e o mesmo `usage`.
 * @param {string[]} conteudos conteúdo de cada `.jsonl`
 * @returns {Uso}
 */
export function somarUso(conteudos) {
  /** @type {Map<string, { model?: string, usage: Record<string, number> }>} */
  const respostas = new Map();
  let linhasInvalidas = 0;
  for (const conteudo of conteudos) {
    for (const linha of conteudo.split(/\r?\n/)) {
      if (!linha.trim()) continue;
      let registro;
      try {
        registro = JSON.parse(linha);
      } catch {
        linhasInvalidas++;
        continue;
      }
      const mensagem = registro?.message;
      if (registro?.type === "assistant" && mensagem?.id && mensagem.usage) {
        respostas.set(mensagem.id, mensagem);
      }
    }
  }
  /** @type {Uso} */
  const uso = {
    entrada: 0,
    saida: 0,
    cacheCriacao: 0,
    cacheLeitura: 0,
    modelos: [],
    mensagens: respostas.size,
    linhasInvalidas,
  };
  for (const { model, usage } of respostas.values()) {
    uso.entrada += usage.input_tokens ?? 0;
    uso.saida += usage.output_tokens ?? 0;
    uso.cacheCriacao += usage.cache_creation_input_tokens ?? 0;
    uso.cacheLeitura += usage.cache_read_input_tokens ?? 0;
    // `<synthetic>`: mensagens que o próprio Claude Code escreve, sem chamar o modelo.
    if (model && model !== "<synthetic>" && !uso.modelos.includes(model)) uso.modelos.push(model);
  }
  return uso;
}

/**
 * Número com ponto de milhar, como no resto da tabela: 8654754 -> "8.654.754".
 * @param {number} numero
 */
export function formatarNumero(numero) {
  return String(numero).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Linha da tabela de prompts/custos.md. O link aponta para `sessoes/<arquivo>`, onde a
 * exportação da sessão fica guardada.
 * @param {Uso} uso
 * @param {{ arquivo: string, ferramenta: string, custo: string }} opcoes
 */
export function formatarLinha(uso, { arquivo, ferramenta, custo }) {
  const colunas = [
    `[${arquivo}](sessoes/${arquivo})`,
    ferramenta,
    uso.modelos.join(", ") || "—",
    formatarNumero(uso.entrada),
    formatarNumero(uso.saida),
    `${formatarNumero(uso.cacheCriacao)} / ${formatarNumero(uso.cacheLeitura)}`,
    custo,
  ];
  return `| ${colunas.join(" | ")} |`;
}

/**
 * @typedef {object} Dependencias
 * @property {(caminho: string) => string} ler conteúdo de um `.jsonl`
 * @property {(pasta: string) => string[]} listar nomes dos arquivos da pasta (vazio se não existir)
 * @property {(texto: string) => void} escrever saída padrão
 * @property {(texto: string) => void} erro saída de erro
 */

/**
 * Lê a sessão principal, os subagentes da pasta `<sessão>/subagents/` e os caminhos extras, e
 * imprime a linha de prompts/custos.md. Devolve o código de saída.
 * @param {string[]} argumentos
 * @param {Dependencias} dependencias
 */
export function executar(argumentos, { ler, listar, escrever, erro }) {
  const { values, positionals } = parseArgs({
    args: argumentos,
    allowPositionals: true,
    options: { ferramenta: { type: "string" }, custo: { type: "string" } },
  });
  const [principal, ...extras] = positionals;
  if (!principal) {
    erro(
      'Uso: node scripts/custo-sessao.mjs <sessão.jsonl> [outros.jsonl ...] [--ferramenta "..."] [--custo "..."]\n',
    );
    return 1;
  }
  const pastaSubagentes = `${principal.replace(/\.jsonl(\.gz)?$/, "")}/subagents`;
  const subagentes = listar(pastaSubagentes)
    .filter((nome) => /\.jsonl(\.gz)?$/.test(nome))
    .sort()
    .map((nome) => `${pastaSubagentes}/${nome}`);
  const arquivos = [principal, ...subagentes, ...extras];
  /** @type {string[]} */
  const conteudos = [];
  for (const caminho of arquivos) {
    try {
      conteudos.push(ler(caminho));
    } catch {
      erro(`Não consegui ler ${caminho}.\n`);
      return 1;
    }
  }
  const uso = somarUso(conteudos);

  erro(
    `${arquivos.length} arquivo(s): a sessão, ${subagentes.length} subagente(s) e ${extras.length} extra(s); ${uso.mensagens} respostas distintas.\n`,
  );
  if (uso.linhasInvalidas > 0) erro(`Aviso: ${uso.linhasInvalidas} linha(s) que não são JSON.\n`);
  escrever(
    `${formatarLinha(uso, {
      arquivo: principal.split(/[\\/]/).pop() ?? principal,
      ferramenta: values.ferramenta ?? FERRAMENTA_PADRAO,
      custo: values.custo ?? CUSTO_PADRAO,
    })}\n`,
  );
  return 0;
}
