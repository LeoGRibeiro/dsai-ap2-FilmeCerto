// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import {
  executar,
  formatarLinha,
  formatarNumero,
  somarUso,
} from "../../../scripts/lib/custo-sessao.mjs";

// Fixtures escritas à mão: sessao.jsonl, o subagente em sessao/subagents/ e extra.jsonl.
const caminho = (nome: string) => fileURLToPath(new URL(`./fixtures/${nome}`, import.meta.url));
const SESSAO = caminho("sessao.jsonl");
const EXTRA = caminho("extra.jsonl");
const ler = (arquivo: string) => readFileSync(arquivo, "utf8");

function dependencias() {
  return {
    ler: vi.fn(ler),
    listar: vi.fn((pasta: string) => {
      try {
        return readdirSync(pasta);
      } catch {
        return [];
      }
    }),
    escrever: vi.fn(),
    erro: vi.fn(),
  };
}

describe("somarUso", () => {
  it("conta cada message.id uma vez e soma os quatro campos de tokens", () => {
    const uso = somarUso([ler(SESSAO)]);

    // msg_01 aparece em duas linhas (um bloco por linha) e entra uma vez só.
    expect(uso).toMatchObject({
      entrada: 10 + 2,
      saida: 200 + 1500,
      cacheCriacao: 1000 + 300,
      cacheLeitura: 5000 + 1_200_000,
      mensagens: 3,
    });
  });

  it("ignora quem não é resposta do assistente, respostas sem id e o modelo <synthetic>", () => {
    const uso = somarUso([ler(SESSAO)]);

    // A linha `api-request` com msg_99 (999 tokens) não entra.
    expect(uso.entrada).toBe(12);
    expect(uso.modelos).toEqual(["claude-opus-5-5"]);
  });

  it("conta as linhas que não são JSON, como a última linha truncada", () => {
    expect(somarUso([ler(SESSAO)]).linhasInvalidas).toBe(1);
    expect(somarUso([ler(EXTRA)]).linhasInvalidas).toBe(0);
  });

  it("não conta de novo uma resposta repetida em outro arquivo", () => {
    const uso = somarUso([ler(SESSAO), ler(EXTRA)]);

    // extra.jsonl repete a msg_02 e traz a msg_20 (1 / 10 / 0 / 100).
    expect(uso).toMatchObject({ entrada: 13, saida: 1710, cacheLeitura: 1_205_100, mensagens: 4 });
  });
});

describe("formatarNumero", () => {
  it("usa ponto de milhar", () => {
    expect(formatarNumero(0)).toBe("0");
    expect(formatarNumero(122)).toBe("122");
    expect(formatarNumero(65_266)).toBe("65.266");
    expect(formatarNumero(134_394_158)).toBe("134.394.158");
  });
});

describe("formatarLinha", () => {
  it("monta a linha no formato da tabela de prompts/custos.md", () => {
    const uso = {
      entrada: 122,
      saida: 65_266,
      cacheCriacao: 162_175,
      cacheLeitura: 8_654_754,
      modelos: ["claude-opus-5-5"],
      mensagens: 60,
      linhasInvalidas: 0,
    };

    expect(
      formatarLinha(uso, {
        arquivo: "2026-11-18-1117-claude-code.jsonl",
        ferramenta: "claude-code (VS Code)",
        custo: "não disponível (extensão VS Code)",
      }),
    ).toBe(
      "| [2026-11-18-1117-claude-code.jsonl](sessoes/2026-11-18-1117-claude-code.jsonl) | claude-code (VS Code) | claude-opus-5-5 | 122 | 65.266 | 162.175 / 8.654.754 | não disponível (extensão VS Code) |",
    );
  });
});

describe("executar", () => {
  it("inclui sozinho os .jsonl da pasta <sessão>/subagents/ e imprime a linha", () => {
    const deps = dependencias();

    expect(executar([SESSAO], deps)).toBe(0);

    expect(deps.ler).toHaveBeenCalledTimes(2);
    expect(deps.ler.mock.calls[1][0]).toMatch(/sessao\/subagents\/agent-a1\.jsonl$/);
    expect(deps.escrever).toHaveBeenCalledWith(
      "| [sessao.jsonl](sessoes/sessao.jsonl) | claude-code (VS Code) | claude-opus-5-5, claude-haiku-4-5 | 17 | 1.740 | 1.300 / 1.205.800 | não disponível (extensão VS Code) |\n",
    );
    expect(deps.erro).toHaveBeenCalledWith(
      "2 arquivo(s): a sessão, 1 subagente(s) e 0 extra(s); 4 respostas distintas.\n",
    );
    expect(deps.erro).toHaveBeenCalledWith("Aviso: 1 linha(s) que não são JSON.\n");
  });

  it("aceita arquivos extras, ferramenta e custo", () => {
    const deps = dependencias();

    executar([SESSAO, EXTRA, "--ferramenta", "claude-code (CLI)", "--custo", "US$ 1,00"], deps);

    expect(deps.escrever).toHaveBeenCalledWith(
      "| [sessao.jsonl](sessoes/sessao.jsonl) | claude-code (CLI) | claude-opus-5-5, claude-haiku-4-5 | 18 | 1.750 | 1.300 / 1.205.900 | US$ 1,00 |\n",
    );
  });

  it("sem pasta de subagentes, lê só a sessão", () => {
    const deps = dependencias();

    expect(executar([EXTRA], deps)).toBe(0);
    expect(deps.ler).toHaveBeenCalledOnce();
    expect(deps.escrever).toHaveBeenCalledWith(
      expect.stringContaining("| 3 | 1.510 | 300 / 1.200.100 |"),
    );
  });

  it("falha sem sessão ou com arquivo que não existe", () => {
    const deps = dependencias();

    expect(executar([], deps)).toBe(1);
    expect(deps.erro).toHaveBeenLastCalledWith(expect.stringContaining("Uso:"));
    expect(executar([caminho("nao-existe.jsonl")], deps)).toBe(1);
    expect(deps.erro).toHaveBeenLastCalledWith(expect.stringContaining("Não consegui ler"));
    expect(deps.escrever).not.toHaveBeenCalled();
  });
});
