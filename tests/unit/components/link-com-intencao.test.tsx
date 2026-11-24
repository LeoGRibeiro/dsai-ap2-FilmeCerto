import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LinkComIntencao } from "@/components/link-com-intencao";
import { CartaoFilme } from "@/features/dashboard/components/cartao-filme";

// O `Link` de verdade só pré-carrega dentro do App Router; aqui basta ver o que ele recebe.
vi.mock("next/link", () => ({
  default: ({ prefetch, ...props }: { prefetch?: boolean | null; href: string }) => (
    <a {...props} data-prefetch={String(prefetch)} />
  ),
}));

const prefetch = (link: HTMLElement) => link.getAttribute("data-prefetch");

describe("LinkComIntencao", () => {
  it("não pré-carrega só por aparecer na tela", () => {
    render(<LinkComIntencao href="/filme/550">Clube da Luta</LinkComIntencao>);

    expect(prefetch(screen.getByRole("link", { name: "Clube da Luta" }))).toBe("false");
  });

  it.each([
    ["mouse em cima", fireEvent.mouseEnter],
    ["toque", fireEvent.touchStart],
    ["foco pelo teclado", fireEvent.focus],
  ])("com %s, volta ao pré-carregamento padrão", (_rotulo, evento) => {
    render(<LinkComIntencao href="/filme/550">Clube da Luta</LinkComIntencao>);
    const link = screen.getByRole("link", { name: "Clube da Luta" });

    evento(link);

    expect(prefetch(link)).toBe("null");
  });

  it("repassa o evento a quem também ouve o mouse", () => {
    const aoEntrar = vi.fn();
    render(
      <LinkComIntencao href="/filme/550" onMouseEnter={aoEntrar}>
        Clube da Luta
      </LinkComIntencao>,
    );

    fireEvent.mouseEnter(screen.getByRole("link", { name: "Clube da Luta" }));

    expect(aoEntrar).toHaveBeenCalledOnce();
  });

  it("o cartão de filme só pré-carrega com intenção", () => {
    render(
      <CartaoFilme filme={{ id: 550, titulo: "Clube da Luta", posterPath: null, ano: 1999 }} />,
    );
    const cartao = screen.getByRole("link", { name: "Clube da Luta (1999)" });
    expect(prefetch(cartao)).toBe("false");

    fireEvent.mouseEnter(cartao);

    expect(prefetch(cartao)).toBe("null");
  });
});
