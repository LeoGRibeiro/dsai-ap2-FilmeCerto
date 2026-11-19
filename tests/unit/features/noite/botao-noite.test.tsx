import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BotaoNoite } from "@/features/noite/components/botao-noite";

describe("BotaoNoite", () => {
  it("leva do dashboard à primeira pergunta do wizard", () => {
    render(<BotaoNoite />);

    expect(screen.getByRole("link", { name: "O que ver hoje?" })).toHaveAttribute("href", "/noite");
  });

  it("'Prefiro uma série' já responde 'Filme ou série?' no mesmo clique", () => {
    render(<BotaoNoite />);

    expect(screen.getByRole("link", { name: "Prefiro uma série" })).toHaveAttribute(
      "href",
      "/noite?tipo=serie",
    );
  });
});
