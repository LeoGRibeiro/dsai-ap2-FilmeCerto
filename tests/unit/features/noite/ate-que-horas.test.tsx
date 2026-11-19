import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AteQueHoras } from "@/features/noite/components/ate-que-horas";
import { lerEstado } from "@/features/noite/estado";

const { router } = vi.hoisted(() => ({ router: { push: vi.fn(), replace: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const BASE = "/noite?humor=cansado&exp=rir&com=a-dois";
const estado = (extra: Record<string, string> = {}) =>
  lerEstado({ humor: "cansado", exp: "rir", com: "a-dois", ...extra });

const grupo = () => within(screen.getByRole("group", { name: "Até que horas?" }));
const botao = (nome: string) => grupo().getByRole("button", { name: nome });

beforeEach(() => {
  // Só o relógio é falso: o navegador da pessoa marca 21h30.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 18, 21, 30));
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("AteQueHoras", () => {
  it("é opcional: 'Tanto faz' vem marcado e não muda a URL", () => {
    render(<AteQueHoras estado={estado()} />);

    expect(
      grupo()
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Tanto faz", "22h", "23h", "Meia-noite", "1h"]);
    expect(botao("Tanto faz")).toHaveAttribute("aria-pressed", "true");
    expect(botao("23h")).toHaveAttribute("aria-pressed", "false");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("escolher 23h às 21h30 manda 90 minutos na URL, mantendo a rodada", async () => {
    render(<AteQueHoras estado={estado({ tom: "1", vistos: "7", trocas: "1" })} />);

    await userEvent.click(botao("23h"));

    expect(router.push).toHaveBeenCalledExactlyOnceWith(
      `${BASE}&ate=23&tempo=90&tom=1&vistos=7&trocas=1`,
    );
  });

  it("calcula com o relógio do clique, atravessando a meia-noite", async () => {
    vi.setSystemTime(new Date(2026, 10, 18, 23, 30));
    render(<AteQueHoras estado={estado()} />);

    await userEvent.click(botao("1h"));

    expect(router.push).toHaveBeenCalledExactlyOnceWith(`${BASE}&ate=1&tempo=90`);
  });

  it("'Tanto faz' tira o horário da URL", async () => {
    render(<AteQueHoras estado={estado({ ate: "23", tempo: "90" })} />);
    expect(botao("23h")).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(botao("Tanto faz"));

    expect(router.push).toHaveBeenCalledExactlyOnceWith(BASE);
  });

  it("com a URL velha, refaz a conta com o relógio de agora", () => {
    // A pessoa escolheu 23h às 21h e recarregou a página às 21h30.
    render(<AteQueHoras estado={estado({ ate: "23", tempo: "120" })} />);

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}&ate=23&tempo=90`);
  });

  it("com a URL em dia (até 5 minutos de diferença), não troca nada", () => {
    render(<AteQueHoras estado={estado({ ate: "23", tempo: "94" })} />);

    expect(router.replace).not.toHaveBeenCalled();
  });
});
