import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePathname, useSearchParams } from "next/navigation";
import { StrictMode, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { enviarEvento } from "@/features/metricas/enviar";
import type { Clima } from "@/features/metricas/eventos";
import { concluirNoite } from "@/features/noite/actions";
import {
  SessaoNoite,
  useSessaoNoite,
  type SessaoDaNoite,
} from "@/features/noite/components/sessao-noite";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/noite"),
  useSearchParams: vi.fn(),
}));
vi.mock("@/features/metricas/enviar", () => ({ enviarEvento: vi.fn() }));
vi.mock("@/features/noite/actions", () => ({ concluirNoite: vi.fn(async () => {}) }));

const COMPLETA = "humor=cansado&exp=rir&com=a-dois";
const respostas: Clima = { humor: "cansado", experiencia: "rir", companhia: "a-dois" };

function naUrl(busca: string) {
  vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams(busca) as never);
}

/** Botão que usa a sessão como as telas do wizard usam. */
function Acao({ nome, usar }: { nome: string; usar: (sessao: SessaoDaNoite) => void }) {
  const sessao = useSessaoNoite();
  return <button onClick={() => usar(sessao)}>{nome}</button>;
}

function Wizard({ children }: { children?: ReactNode }) {
  return (
    <SessaoNoite>
      <Acao nome="concluir" usar={(sessao) => sessao.concluir(respostas)} />
      <Acao nome="escolher" usar={(sessao) => sessao.marcarEscolha()} />
      {children}
    </SessaoNoite>
  );
}

const enviados = (nome: string) =>
  vi.mocked(enviarEvento).mock.calls.filter(([evento]) => evento.nome === nome);

/** Navega dentro de /noite: o layout continua montado, só a URL muda. */
function navegar(rerender: (ui: ReactNode) => void, busca: string) {
  naUrl(busca);
  rerender(<Wizard />);
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  // Desmonta ainda com o relógio falso, para a saída de um teste não vazar para o seguinte.
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("SessaoNoite: wizard_iniciado", () => {
  it("conta uma vez ao abrir sem respostas, mesmo voltando à 1ª pergunta", () => {
    naUrl("");
    const { rerender } = render(<Wizard />);
    navegar(rerender, "humor=cansado");
    navegar(rerender, "");

    expect(enviados("wizard_iniciado")).toEqual([[{ nome: "wizard_iniciado" }]]);
  });

  it("não conta quem chega com as respostas na URL", () => {
    naUrl(COMPLETA);
    render(<Wizard />);

    expect(enviados("wizard_iniciado")).toHaveLength(0);
  });

  it("conta de novo ao refazer as perguntas depois do resultado", () => {
    naUrl("");
    const { rerender } = render(<Wizard />);
    navegar(rerender, COMPLETA);
    navegar(rerender, "");

    expect(enviados("wizard_iniciado")).toHaveLength(2);
  });
});

describe("SessaoNoite: concluir", () => {
  it("chama concluirNoite uma vez por sessão, e de novo depois de refazer", async () => {
    naUrl(COMPLETA);
    const { rerender } = render(<Wizard />);

    await userEvent.click(screen.getByRole("button", { name: "concluir" }));
    await userEvent.click(screen.getByRole("button", { name: "concluir" }));
    expect(concluirNoite).toHaveBeenCalledExactlyOnceWith(respostas);

    navegar(rerender, "");
    navegar(rerender, COMPLETA);
    await userEvent.click(screen.getByRole("button", { name: "concluir" }));
    expect(concluirNoite).toHaveBeenCalledTimes(2);
  });
});

describe("SessaoNoite: wizard_abandonado", () => {
  it("no pagehide sem escolha, envia uma vez com a etapa do resultado", () => {
    naUrl(COMPLETA);
    render(<Wizard />);

    window.dispatchEvent(new Event("pagehide"));
    window.dispatchEvent(new Event("pagehide"));

    expect(enviados("wizard_abandonado")).toEqual([
      [{ nome: "wizard_abandonado", dados: { etapa: "resultado" } }],
    ]);
  });

  it("na sala da 'Noite a dois', sob o mesmo layout, nada é contado como wizard", () => {
    vi.mocked(usePathname).mockReturnValue("/noite/juntos/5b0f3c9e-6a1d-4c51-9a8e-2f4d1c7b9e10");
    naUrl("");
    const { unmount } = render(<Wizard />);

    unmount();
    act(() => vi.runAllTimers());

    expect(enviarEvento).not.toHaveBeenCalled();
    vi.mocked(usePathname).mockReturnValue("/noite");
  });

  it("ao sair de /noite pelo app, envia com a etapa das perguntas", () => {
    naUrl("humor=cansado");
    const { unmount } = render(<Wizard />);

    unmount();
    act(() => vi.runAllTimers());

    expect(enviados("wizard_abandonado")).toEqual([
      [{ nome: "wizard_abandonado", dados: { etapa: "perguntas" } }],
    ]);
  });

  it("depois de 'Vou ver esse!', sair não é abandono", async () => {
    naUrl(COMPLETA);
    const { unmount } = render(<Wizard />);

    await userEvent.click(screen.getByRole("button", { name: "escolher" }));
    window.dispatchEvent(new Event("pagehide"));
    unmount();
    act(() => vi.runAllTimers());

    expect(enviados("wizard_abandonado")).toHaveLength(0);
  });

  it("a montagem dupla do modo estrito não conta como saída", () => {
    naUrl("");
    render(
      <StrictMode>
        <Wizard />
      </StrictMode>,
    );
    act(() => vi.runAllTimers());

    expect(enviados("wizard_abandonado")).toHaveLength(0);
    expect(enviados("wizard_iniciado")).toHaveLength(1);
  });
});
