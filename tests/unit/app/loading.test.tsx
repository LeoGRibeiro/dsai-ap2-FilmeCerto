import { render, screen } from "@testing-library/react";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import type { ComponentType } from "react";
import { describe, expect, it } from "vitest";

const RAIZ = path.resolve(__dirname, "../../../src/app/(app)");

/** Pastas de `(app)` que têm `page.tsx`, relativas à raiz do grupo. */
function pastasComPagina(pasta = RAIZ): string[] {
  const filhas = readdirSync(pasta, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .flatMap((item) => pastasComPagina(path.join(pasta, item.name)));
  return existsSync(path.join(pasta, "page.tsx")) ? [pasta, ...filhas] : filhas;
}

/** O `loading.tsx` que o Next usa para a pasta: o dela ou o da pasta mais próxima acima. */
function loadingMaisProximo(pasta: string): string | null {
  for (let atual = pasta; atual.startsWith(RAIZ); atual = path.dirname(atual)) {
    const arquivo = path.join(atual, "loading.tsx");
    if (existsSync(arquivo)) return arquivo;
  }
  return null;
}

const paginas = pastasComPagina();
const loadings = [...new Set(paginas.map(loadingMaisProximo).filter((a) => a !== null))];
const nome = (arquivo: string) => path.relative(RAIZ, arquivo).replaceAll("\\", "/");

describe("loading.tsx da área logada", () => {
  it("encontra as páginas da área logada", () => {
    expect(paginas.map((p) => nome(path.join(p, "page.tsx")))).toEqual(
      expect.arrayContaining(["dashboard/page.tsx", "noite/page.tsx", "filme/[id]/page.tsx"]),
    );
  });

  it.each(paginas.map((p) => [nome(path.join(p, "page.tsx")), p]))(
    "%s tem um loading.tsx no caminho, então o clique troca a tela na hora",
    (_rotulo, pasta) => {
      expect(loadingMaisProximo(pasta)).not.toBeNull();
    },
  );

  it.each(["dashboard", "noite", "filme/[id]", "serie/[id]"])(
    "%s tem um esqueleto próprio, no formato da tela",
    (pasta) => {
      expect(existsSync(path.join(RAIZ, pasta, "loading.tsx"))).toBe(true);
    },
  );

  it.each(loadings.map((arquivo) => [nome(arquivo), arquivo]))(
    "%s anuncia o carregamento para leitor de tela",
    async (_rotulo, arquivo) => {
      const { default: Carregando } = (await import(arquivo)) as { default: ComponentType };
      render(<Carregando />);

      const status = screen.getByRole("status");
      expect(status).toHaveAttribute("aria-busy", "true");
      expect(status).toHaveTextContent(/Carregando/);
    },
  );
});
