import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { alternarLista } from "@/features/listas/actions";
import { enviarEvento } from "@/features/metricas/enviar";
import { EsseNao } from "@/features/noite/components/esse-nao";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/features/metricas/enviar", () => ({ enviarEvento: vi.fn() }));
vi.mock("@/features/listas/actions", () => ({ alternarLista: vi.fn(async () => ({})) }));

afterEach(() => vi.clearAllMocks());

const proximas = {
  "ja-vi": "/noite?r=ja-vi",
  "nao-e-o-clima": "/noite?r=clima",
  "muito-longo": "/noite?r=longo",
  outro: "/noite?r=outro",
};
const destaque = { id: 550, titulo: "Clube da Luta" };

function abrir(restantes = 4) {
  render(<EsseNao proximas={proximas} trocasRestantes={restantes} destaque={destaque} />);
}

async function motivo(nome: string) {
  await userEvent.click(screen.getByRole("button", { name: "Esse não" }));
  await userEvent.click(
    within(screen.getByRole("group", { name: "Por que não?" })).getByRole("button", { name: nome }),
  );
}

describe("EsseNao", () => {
  it("mostra as trocas restantes e pede o porquê com os 4 motivos do cliente", async () => {
    abrir(3);
    expect(screen.getByText("Trocas restantes: 3")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Esse não" }));

    const motivos = within(screen.getByRole("group", { name: "Por que não?" })).getAllByRole(
      "button",
    );
    expect(motivos.map((b) => b.textContent)).toEqual([
      "Já vi",
      "Não é o clima",
      "Muito longo",
      "Outro",
    ]);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("direciona o foco ao primeiro motivo usando somente o teclado", async () => {
    abrir();

    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Esse não" })).toHaveFocus();

    await userEvent.keyboard("{Enter}");

    expect(await screen.findByRole("button", { name: "Já vi" })).toHaveFocus();
  });

  it("direciona o foco ao título ao abrir a confirmação de 'Já vi'", async () => {
    abrir();

    await userEvent.click(screen.getByRole("button", { name: "Esse não" }));
    await userEvent.click(screen.getByRole("button", { name: "Já vi" }));

    expect(
      screen.getByRole("heading", {
        name: /Quer marcar Clube da Luta como “Já assisti”/,
      }),
    ).toHaveFocus();
  });

  it.each([
    ["Não é o clima", "nao-e-o-clima", "/noite?r=clima"],
    ["Muito longo", "muito-longo", "/noite?r=longo"],
    ["Outro", "outro", "/noite?r=outro"],
  ])("'%s' registra a troca e vai para a rodada do motivo", async (nome, slug, url) => {
    abrir();

    await motivo(nome);

    expect(enviarEvento).toHaveBeenCalledExactlyOnceWith({
      nome: "wizard_troca",
      dados: { motivo: slug },
    });
    expect(router.push).toHaveBeenCalledExactlyOnceWith(url);
  });

  it("'Já vi' oferece marcar o destaque como 'Já assisti' antes de trocar", async () => {
    abrir();

    await motivo("Já vi");
    expect(enviarEvento).toHaveBeenCalledWith({ nome: "wizard_troca", dados: { motivo: "ja-vi" } });
    expect(screen.getByText(/como “Já assisti”/)).toHaveTextContent("Clube da Luta");
    expect(router.push).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Marcar e trocar" }));

    const dados = vi.mocked(alternarLista).mock.calls[0]![1];
    expect(Object.fromEntries(dados)).toEqual({
      tipo: "filme",
      tmdbId: "550",
      status: "assistido",
    });
    expect(router.push).toHaveBeenCalledExactlyOnceWith("/noite?r=ja-vi");
  });

  it("de uma série, 'Marcar e trocar' marca a série, não o filme de mesmo ID", async () => {
    render(
      <EsseNao
        proximas={proximas}
        trocasRestantes={4}
        destaque={{ tipo: "serie", id: 550, titulo: "Dark" }}
      />,
    );

    await motivo("Já vi");
    await userEvent.click(screen.getByRole("button", { name: "Marcar e trocar" }));

    const dados = vi.mocked(alternarLista).mock.calls[0]![1];
    expect(Object.fromEntries(dados)).toEqual({
      tipo: "serie",
      tmdbId: "550",
      status: "assistido",
    });
  });

  it("'Só trocar' troca sem mexer nas listas", async () => {
    abrir();

    await motivo("Já vi");
    await userEvent.click(screen.getByRole("button", { name: "Só trocar" }));

    expect(alternarLista).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledExactlyOnceWith("/noite?r=ja-vi");
  });

  it("se marcar falha, mostra o erro e não troca", async () => {
    vi.mocked(alternarLista).mockResolvedValueOnce({ mensagem: "Sua sessão expirou." });
    abrir();

    await motivo("Já vi");
    await userEvent.click(screen.getByRole("button", { name: "Marcar e trocar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Sua sessão expirou.");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("no limite de trocas, troca 'Esse não' por 'Refazer as perguntas'", () => {
    render(<EsseNao proximas={null} trocasRestantes={0} destaque={destaque} />);

    expect(screen.queryByRole("button", { name: "Esse não" })).not.toBeInTheDocument();
    expect(screen.getByText("Você chegou ao limite de trocas.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Refazer as perguntas" })).toHaveAttribute(
      "href",
      "/noite",
    );
  });

  it("no limite de trocas de uma série, refaz as perguntas de série", () => {
    render(
      <EsseNao
        proximas={null}
        trocasRestantes={0}
        destaque={{ tipo: "serie", id: 1, titulo: "X" }}
      />,
    );

    expect(screen.getByRole("link", { name: "Refazer as perguntas" })).toHaveAttribute(
      "href",
      "/noite?tipo=serie",
    );
  });
});
