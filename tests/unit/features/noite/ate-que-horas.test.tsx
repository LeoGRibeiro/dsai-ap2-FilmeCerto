import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AteQueHoras } from "@/features/noite/components/ate-que-horas";
import { SemTempo } from "@/features/noite/components/sem-tempo";
import { lerEstado } from "@/features/noite/estado";

const { router } = vi.hoisted(() => ({ router: { push: vi.fn(), replace: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const BASE = "/noite?humor=cansado&exp=rir&com=a-dois";
const estado = (extra: Record<string, string> = {}) =>
  lerEstado({ humor: "cansado", exp: "rir", com: "a-dois", ...extra });

const grupo = () => within(screen.getByRole("group", { name: "Até que horas?" }));
const botao = (nome: string | RegExp) => grupo().getByRole("button", { name: nome });

/** Só o relógio é falso: o navegador da pessoa marca `hora`:`minuto`. */
const relogio = (hora: number, minuto = 0) =>
  vi.setSystemTime(new Date(2026, 10, 18, hora, minuto));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  relogio(16, 6);
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("AteQueHoras", () => {
  it("conta a partir de agora: às 16h06, cada opção diz até que horas vai", () => {
    render(<AteQueHoras estado={estado()} />);

    expect(
      grupo()
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual([
      "Tanto faz",
      "1h30 até as 17h36",
      "2h até as 18h06",
      "2h30 até as 18h36",
      "3h até as 19h06",
      "Outro horário",
    ]);
    expect(botao("Tanto faz")).toHaveAttribute("aria-pressed", "true");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("perto da meia-noite, o término vira o dia", () => {
    relogio(23, 30);
    render(<AteQueHoras estado={estado()} />);

    expect(botao(/^1h30/)).toHaveTextContent("até a 1h");
    expect(botao(/^2h /)).toHaveTextContent("até a 1h30");
  });

  it("'2h' manda 120 minutos na URL, mantendo a rodada, e fica marcado", async () => {
    const { rerender } = render(
      <AteQueHoras estado={estado({ tom: "1", vistos: "7", trocas: "1" })} />,
    );

    await userEvent.click(botao(/^2h /));

    expect(router.push).toHaveBeenCalledExactlyOnceWith(
      `${BASE}&tempo=120&tom=1&vistos=7&trocas=1`,
    );
    rerender(<AteQueHoras estado={estado({ tempo: "120" })} />);
    expect(botao(/^2h /)).toHaveAttribute("aria-pressed", "true");
    expect(botao("Tanto faz")).toHaveAttribute("aria-pressed", "false");
  });

  it("'Outro horário' abre o seletor e manda o horário e os minutos que faltam", async () => {
    relogio(21, 30);
    render(<AteQueHoras estado={estado()} />);
    expect(screen.queryByLabelText("Horário")).not.toBeInTheDocument();

    await userEvent.click(botao("Outro horário"));
    await userEvent.type(screen.getByLabelText("Horário"), "22:15");
    await userEvent.click(screen.getByRole("button", { name: "Usar" }));

    expect(router.push).toHaveBeenCalledExactlyOnceWith(`${BASE}&ate=2215&tempo=45`);
  });

  it("com um horário na URL, o 'Outro horário' vem marcado, com o horário no seletor", () => {
    relogio(21, 30);
    render(<AteQueHoras estado={estado({ ate: "2215", tempo: "45" })} />);

    expect(botao(/^Outro horário/)).toHaveAttribute("aria-pressed", "true");
    expect(botao(/^Outro horário/)).toHaveTextContent("até as 22h15");
    expect(screen.getByLabelText("Horário")).toHaveValue("22:15");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("'Tanto faz' tira o horário da URL", async () => {
    render(<AteQueHoras estado={estado({ ate: "2215", tempo: "369" })} />);

    await userEvent.click(botao("Tanto faz"));

    expect(router.push).toHaveBeenCalledExactlyOnceWith(BASE);
  });

  it("um horário numa URL velha é recalculado com o relógio de agora", () => {
    // A pessoa escolheu 22h15 às 21h e recarregou a página às 21h30.
    relogio(21, 30);
    render(<AteQueHoras estado={estado({ ate: "2215", tempo: "75" })} />);

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}&ate=2215&tempo=45`);
  });

  it("o tempo a partir de agora não envelhece: '2h' continua 2h", () => {
    render(<AteQueHoras estado={estado({ tempo: "120" })} />);

    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe("SemTempo", () => {
  it("com horário, diz até que horas e quanto falta", () => {
    render(<SemTempo estado={estado({ ate: "2215", tempo: "45" })} tempo={45} />);

    expect(screen.getByRole("heading")).toHaveTextContent(
      "Não dá tempo de ver um filme até as 22h15",
    );
    expect(screen.getByText(/^Faltam só 45 minutos\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tanto faz o horário" })).toHaveAttribute("href", BASE);
  });

  it("sem horário, diz o tempo que a pessoa tem", () => {
    render(<SemTempo estado={estado({ tempo: "30" })} tempo={30} />);

    expect(screen.getByRole("heading")).toHaveTextContent(
      "Não dá tempo de ver um filme em 30 minutos",
    );
    expect(screen.queryByText(/Faltam só/)).not.toBeInTheDocument();
  });
});
