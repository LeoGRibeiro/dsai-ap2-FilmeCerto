import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CompartilharNoite } from "@/features/noite/components/compartilhar-noite";

const MENSAGEM = "Hoje vamos ver Velozes & Furiosos #7, termina às 23h50";

/** Liga a Web Share do navegador com a função dada (o jsdom não tem `navigator.share`). */
function comWebShare(share: (dados: ShareData) => Promise<void>) {
  Object.defineProperty(navigator, "share", { value: vi.fn(share), configurable: true });
  return navigator.share as ReturnType<typeof vi.fn>;
}

const compartilhar = () => (
  <CompartilharNoite tmdbId={7} titulo="Velozes & Furiosos #7" duracaoMin={125} />
);

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 10, 18, 21, 45));
});

afterEach(() => {
  Reflect.deleteProperty(navigator, "share");
  vi.useRealTimers();
});

describe("CompartilharNoite sem Web Share", () => {
  it("é um link do WhatsApp com a mensagem e o link do filme, em nova aba", () => {
    render(compartilhar());

    const link = screen.getByRole("link", { name: "Compartilhar no WhatsApp" });
    const href = new URL(link.getAttribute("href")!);
    expect(href.origin + href.pathname).toBe("https://wa.me/");
    expect(href.searchParams.get("text")).toBe(`${MENSAGEM}\n${window.location.origin}/filme/7`);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(screen.queryByRole("button", { name: "Compartilhar" })).not.toBeInTheDocument();
  });

  it("sem duração, manda só o filme", () => {
    render(<CompartilharNoite tmdbId={7} titulo="Duna" duracaoMin={null} />);

    const href = screen
      .getByRole("link", { name: "Compartilhar no WhatsApp" })
      .getAttribute("href");
    expect(new URL(href!).searchParams.get("text")).toBe(
      `Hoje vamos ver Duna\n${window.location.origin}/filme/7`,
    );
  });
});

describe("CompartilharNoite com Web Share", () => {
  it("abre o compartilhamento do aparelho com a hora do clique e a URL do filme", async () => {
    const share = comWebShare(async () => {});
    render(compartilhar());
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    // A pessoa demora 10 minutos para tocar: vale a hora do toque.
    vi.setSystemTime(new Date(2026, 10, 18, 21, 55));
    await userEvent.click(screen.getByRole("button", { name: "Compartilhar" }));

    expect(share).toHaveBeenCalledExactlyOnceWith({
      text: "Hoje vamos ver Velozes & Furiosos #7, termina às 0h00",
      url: `${window.location.origin}/filme/7`,
    });
  });

  it("se a pessoa cancela, nada muda e nenhum erro aparece", async () => {
    comWebShare(async () => {
      throw new DOMException("Cancelado", "AbortError");
    });
    render(compartilhar());

    await userEvent.click(screen.getByRole("button", { name: "Compartilhar" }));

    expect(screen.getByRole("button", { name: "Compartilhar" })).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("se o aparelho recusa, oferece o link do WhatsApp", async () => {
    comWebShare(async () => {
      throw new DOMException("Sem permissão", "NotAllowedError");
    });
    render(compartilhar());

    await userEvent.click(screen.getByRole("button", { name: "Compartilhar" }));

    const link = await screen.findByRole("link", { name: "Compartilhar no WhatsApp" });
    expect(new URL(link.getAttribute("href")!).searchParams.get("text")).toContain(MENSAGEM);
    expect(screen.queryByRole("button", { name: "Compartilhar" })).not.toBeInTheDocument();
  });
});
