import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BotaoNoite } from "@/features/noite/components/botao-noite";

describe("BotaoNoite", () => {
  it("leva do dashboard à primeira pergunta do wizard", () => {
    render(<BotaoNoite />);

    expect(screen.getByRole("link", { name: "O que ver hoje?" })).toHaveAttribute("href", "/noite");
  });

  it("é um link só: a série é escolhida na primeira tela do wizard", () => {
    render(<BotaoNoite />);

    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "Prefiro uma série" })).toBeNull();
  });
});
