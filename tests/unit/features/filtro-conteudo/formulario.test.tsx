import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FormularioFiltro } from "@/features/filtro-conteudo/components/formulario-filtro";

const acoes = vi.hoisted(() => ({ salvarFiltro: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/features/filtro-conteudo/actions", () => acoes);

describe("FormularioFiltro", () => {
  it("mostra as quatro opções com a explicação, e Sem filtro marcado por padrão", () => {
    render(<FormularioFiltro atual={null} />);
    const opcoes = screen.getAllByRole("radio");
    expect(opcoes).toHaveLength(4);
    expect(screen.getByRole("radio", { name: /Sem filtro/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Até 10 anos/ })).toHaveAccessibleName(
      expect.stringContaining("Títulos de 12 a 16 anos abrem com um aviso."),
    );
  });

  it("marca a opção atual", () => {
    render(<FormularioFiltro atual="18" />);
    expect(screen.getByRole("radio", { name: /Sem conteúdo \+18/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Sem filtro/ })).not.toBeChecked();
  });

  it("envia só a opção escolhida e confirma quando salva", async () => {
    const usuario = userEvent.setup();
    render(<FormularioFiltro atual={null} />);
    await usuario.click(screen.getByRole("radio", { name: /Até 14 anos/ }));
    await usuario.click(screen.getByRole("button", { name: "Salvar filtro" }));

    await waitFor(() => expect(acoes.salvarFiltro).toHaveBeenCalled());
    const form = (acoes.salvarFiltro.mock.lastCall as unknown[] | undefined)?.[1] as FormData;
    expect([...form.entries()]).toEqual([["filtro", "14"]]);
    expect(await screen.findByRole("status")).toHaveTextContent("Alterações salvas.");
  });
});
