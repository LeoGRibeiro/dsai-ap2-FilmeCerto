import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FormularioFiltros, FormularioNome } from "@/features/busca/components/formularios-busca";
import type { FiltrosBusca } from "@/features/busca/parametros";

const FILTROS: FiltrosBusca = {
  genero: null,
  ano: null,
  duracao: "indiferente",
  ordem: "popularidade",
};

// Com `next/form`, buscar de novo já estando em /busca navega pelo cliente e a página
// renderiza os mesmos formulários com outras props (SPEC/2026-11-23-navegacao-rapida.md).
describe("formulários da busca depois de uma navegação pelo cliente", () => {
  it("o campo do nome mostra a busca nova, não a anterior", () => {
    const { rerender } = render(<FormularioNome texto="matrix" />);
    expect(screen.getByRole("searchbox", { name: "Nome do filme" })).toHaveValue("matrix");

    rerender(<FormularioNome texto="nada" />);

    expect(screen.getByRole("searchbox", { name: "Nome do filme" })).toHaveValue("nada");
  });

  it("os filtros mostram os valores da URL nova", () => {
    const { rerender } = render(<FormularioFiltros filtros={{ ...FILTROS, ano: 1999 }} />);
    expect(screen.getByLabelText("Ano de lançamento")).toHaveValue(1999);

    rerender(<FormularioFiltros filtros={{ ...FILTROS, ano: 2010 }} />);

    expect(screen.getByLabelText("Ano de lançamento")).toHaveValue(2010);
  });
});
