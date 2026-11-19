// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import {
  agruparFaixas,
  cruzarCobertura,
  executar,
  formatarResumo,
  lerLcov,
  lerLinhasNovas,
} from "../../../scripts/lib/cobertura-diff.mjs";

// No Windows o vitest grava o caminho com barra invertida.
const LCOV = `TN:
SF:src\\features\\noite\\estado.ts
FN:3,lerEstado
DA:3,4
DA:4,4
DA:5,0
DA:9,0
end_of_record
TN:
SF:src/proxy.ts
DA:7,0
DA:8,2
end_of_record
`;

const DIFF = `diff --git a/src/features/noite/estado.ts b/src/features/noite/estado.ts
index 1111111..2222222 100644
--- a/src/features/noite/estado.ts
+++ b/src/features/noite/estado.ts
@@ -2,0 +3,3 @@ import x from "y";
+export function lerEstado() {
+  return 1;
+}
@@ -8 +9 @@ export function outra() {
-  antiga();
+  nova();
@@ -20,2 +22,0 @@ export function fim() {
-  apagada();
-  apagada();
diff --git a/tests/unit/x.test.ts b/tests/unit/x.test.ts
new file mode 100644
--- /dev/null
+++ b/tests/unit/x.test.ts
@@ -0,0 +1,2 @@
+it("x", () => {});
+
diff --git a/src/velho.ts b/src/velho.ts
deleted file mode 100644
--- a/src/velho.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-a
-b
`;

describe("lerLcov", () => {
  it("lê as linhas executáveis de cada arquivo, com caminho em barras normais", () => {
    const cobertura = lerLcov(LCOV);

    expect([...cobertura.keys()]).toEqual(["src/features/noite/estado.ts", "src/proxy.ts"]);
    expect(cobertura.get("src/features/noite/estado.ts")).toEqual(
      new Map([
        [3, 4],
        [4, 4],
        [5, 0],
        [9, 0],
      ]),
    );
  });

  it("junta registros repetidos do mesmo arquivo, valendo a maior contagem", () => {
    const cobertura = lerLcov("SF:a.ts\nDA:1,0\nend_of_record\nSF:./a.ts\nDA:1,3\nDA:2,0\n");

    expect(cobertura.get("a.ts")).toEqual(
      new Map([
        [1, 3],
        [2, 0],
      ]),
    );
  });
});

describe("lerLinhasNovas", () => {
  it("devolve as linhas adicionadas na numeração do arquivo novo", () => {
    const novas = lerLinhasNovas(DIFF);

    expect(novas.get("src/features/noite/estado.ts")).toEqual(new Set([3, 4, 5, 9]));
    expect(novas.get("tests/unit/x.test.ts")).toEqual(new Set([1, 2]));
  });

  it("ignora arquivos apagados", () => {
    expect(lerLinhasNovas(DIFF).has("src/velho.ts")).toBe(false);
  });

  it("aceita caminho entre aspas", () => {
    const novas = lerLinhasNovas('+++ "b/src/com espaço.ts"\n@@ -0,0 +1 @@\n+a\n');

    expect(novas.get("src/com espaço.ts")).toEqual(new Set([1]));
  });
});

describe("cruzarCobertura", () => {
  it("conta só as linhas novas que o v8 instrumentou, de arquivos medidos", () => {
    const resultado = cruzarCobertura(lerLcov(LCOV), lerLinhasNovas(DIFF));

    // Linha 5 nova e instrumentada mas sem execução; linha 9 também. Testes ficam de fora.
    expect(resultado).toEqual({
      arquivos: [
        { arquivo: "src/features/noite/estado.ts", total: 4, cobertas: 2, descobertas: [5, 9] },
      ],
      total: 4,
      cobertas: 2,
      percentual: 50,
    });
  });

  it("sem linha nova medida, o percentual é nulo", () => {
    const resultado = cruzarCobertura(lerLcov(LCOV), new Map([["README.md", new Set([1])]]));

    expect(resultado).toEqual({ arquivos: [], total: 0, cobertas: 0, percentual: null });
  });
});

describe("agruparFaixas", () => {
  it("agrupa números seguidos em faixas", () => {
    expect(agruparFaixas([3, 4, 5, 9, 11, 12])).toBe("3-5, 9, 11-12");
    expect(agruparFaixas([])).toBe("");
  });
});

describe("formatarResumo", () => {
  it("mostra o percentual, as linhas sem teste e o aviso abaixo do mínimo", () => {
    const texto = formatarResumo(
      cruzarCobertura(lerLcov(LCOV), lerLinhasNovas(DIFF)),
      "origin/main",
    );

    expect(texto).toContain("### Cobertura das linhas novas contra `origin/main`");
    expect(texto).toContain("**50,0%** das 4 linhas novas medidas");
    expect(texto).toContain("**Abaixo do mínimo de 70%.**");
    expect(texto).toContain("| `src/features/noite/estado.ts` | 4 | 2 | 50,0% | 5, 9 |");
  });

  it("não acusa nada quando passa do mínimo", () => {
    const resultado = cruzarCobertura(
      lerLcov("SF:a.ts\nDA:1,1\nDA:2,1\nDA:3,0\nDA:4,1\n"),
      new Map([["a.ts", new Set([1, 2, 3, 4])]]),
    );
    const texto = formatarResumo(resultado, "4ac8b98");

    expect(texto).toContain("**75,0%**");
    expect(texto).toContain("Mínimo: 70%.");
    expect(texto).not.toContain("Abaixo");
  });

  it("explica quando não há linha nova medida", () => {
    const texto = formatarResumo(cruzarCobertura(new Map(), new Map()), "origin/main");

    expect(texto).toContain("Nenhuma linha nova de código medido");
  });
});

describe("executar", () => {
  function dependencias(lcov = LCOV) {
    return {
      lerLcov: vi.fn(() => lcov),
      diff: vi.fn((base: string) => (base === "origin/main" ? DIFF : "")),
      escrever: vi.fn(),
      erro: vi.fn(),
      resumo: vi.fn(),
      avisar: vi.fn(),
    };
  }

  it("mede cada base, publica o resumo e avisa só a que ficou abaixo do mínimo", () => {
    const deps = dependencias();

    expect(executar(["origin/main", "4ac8b98"], deps)).toBe(0);

    expect(deps.diff).toHaveBeenCalledWith("origin/main", [
      "src/features/noite/estado.ts",
      "src/proxy.ts",
    ]);
    expect(deps.diff).toHaveBeenCalledWith("4ac8b98", expect.any(Array));
    expect(deps.escrever).toHaveBeenCalledTimes(2);
    expect(deps.resumo).toHaveBeenCalledTimes(2);
    expect(deps.resumo.mock.calls[1][0]).toContain("contra `4ac8b98`");
    expect(deps.avisar).toHaveBeenCalledOnce();
    expect(deps.avisar).toHaveBeenCalledWith(
      "Cobertura das linhas novas contra origin/main: 50,0% (mínimo: 70%).",
    );
  });

  it("funciona fora do GitHub Actions, sem resumo nem aviso", () => {
    const { resumo, avisar, ...deps } = dependencias();

    expect(executar(["origin/main"], deps)).toBe(0);
    expect(deps.escrever).toHaveBeenCalledOnce();
    expect(resumo).not.toHaveBeenCalled();
    expect(avisar).not.toHaveBeenCalled();
  });

  it("falha sem base ou sem lcov.info", () => {
    const deps = dependencias();
    deps.lerLcov.mockImplementation(() => {
      throw new Error("ENOENT");
    });

    expect(executar([], deps)).toBe(1);
    expect(deps.erro).toHaveBeenLastCalledWith(expect.stringContaining("Uso:"));
    expect(executar(["origin/main"], deps)).toBe(1);
    expect(deps.erro).toHaveBeenLastCalledWith(expect.stringContaining("pnpm test:coverage"));
    expect(deps.escrever).not.toHaveBeenCalled();
  });
});
