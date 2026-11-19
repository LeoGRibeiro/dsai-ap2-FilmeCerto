import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BotoesReacao } from "@/features/reacoes/components/botoes-reacao";
import { reacaoSchema } from "@/features/reacoes/schema";

vi.mock("@/features/reacoes/actions", () => ({ alternarReacao: vi.fn(async () => ({})) }));

describe("reacaoSchema", () => {
  it.each(["nao-gostei", "gostei", "amei"])("aceita %s", (reacao) => {
    expect(reacaoSchema.safeParse({ tmdbId: 550, reacao }).success).toBe(true);
  });

  it("sem tipo é filme, e aceita série", () => {
    expect(reacaoSchema.parse({ tmdbId: 550, reacao: "amei" }).tipo).toBe("filme");
    expect(reacaoSchema.parse({ tipo: "serie", tmdbId: 1, reacao: "amei" }).tipo).toBe("serie");
  });

  it.each([
    { tipo: "anime", tmdbId: 550, reacao: "amei" },
    { tmdbId: 550, reacao: "odiei" },
    { tmdbId: 0, reacao: "amei" },
    { tmdbId: -3, reacao: "amei" },
    { tmdbId: 1.5, reacao: "amei" },
  ])("rejeita %j", (dados) => {
    expect(reacaoSchema.safeParse(dados).success).toBe(false);
  });
});

describe("BotoesReacao", () => {
  it("envia o tipo recebido em cada botão, e filme sem ele", () => {
    const tipos = (container: HTMLElement) =>
      [...container.querySelectorAll<HTMLInputElement>('input[name="tipo"]')].map((i) => i.value);
    const serie = render(<BotoesReacao tmdbId={1399} atual={null} tipo="serie" />);
    expect(tipos(serie.container)).toEqual(["serie", "serie", "serie"]);
    serie.unmount();

    const filme = render(<BotoesReacao tmdbId={550} atual={null} />);
    expect(tipos(filme.container)).toEqual(["filme", "filme", "filme"]);
  });

  it("mostra os 3 rótulos e nenhum marcado sem reação", () => {
    render(<BotoesReacao tmdbId={550} atual={null} />);
    const grupo = screen.getByRole("group", { name: "O que achou?" });
    expect(grupo).toBeInTheDocument();
    for (const rotulo of ["Não é pra mim", "Gostei", "Amei"]) {
      expect(screen.getByRole("button", { name: rotulo })).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("marca só a reação atual", () => {
    render(<BotoesReacao tmdbId={550} atual="gostei" />);
    expect(screen.getByRole("button", { name: "Gostei" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Amei" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Não é pra mim" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
