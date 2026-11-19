import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { criarSala, montarSala, responderSala } from "@/features/noite/actions-sala";
import { EnviarRespostas } from "@/features/noite/components/enviar-respostas";
import { EsperandoSala, INTERVALO_SALA_MS } from "@/features/noite/components/esperando-sala";
import { JuntosBotao } from "@/features/noite/components/juntos-botao";
import { LinkSala } from "@/features/noite/components/link-sala";
import { MontarSala } from "@/features/noite/components/montar-sala";

const { router } = vi.hoisted(() => ({ router: { refresh: vi.fn(), push: vi.fn() } }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/features/metricas/enviar", () => ({ enviarEvento: vi.fn() }));
vi.mock("@/features/como-foi/actions", () => ({ escolherFilme: vi.fn(async () => ({})) }));
vi.mock("@/features/noite/actions-sala", () => ({
  criarSala: vi.fn(),
  montarSala: vi.fn(),
  responderSala: vi.fn(),
}));

const SALA = "5b0f3c9e-6a1d-4c51-9a8e-2f4d1c7b9e10";
afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("JuntosBotao", () => {
  it("cria a sala e mostra a mensagem se não der", async () => {
    vi.mocked(criarSala).mockResolvedValue({ mensagem: "Não foi possível criar a sala agora." });
    render(<JuntosBotao />);

    await userEvent.click(screen.getByRole("button", { name: "Vamos escolher juntos" }));

    expect(criarSala).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível criar a sala");
  });
});

describe("LinkSala", () => {
  it("mostra o link absoluto, copia e manda pelo WhatsApp", async () => {
    const usuario = userEvent.setup();
    const escrever = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<LinkSala sala={SALA} />);
    const url = `${window.location.origin}/noite/juntos/${SALA}`;

    expect(screen.getByRole("textbox", { name: "Link da sala" })).toHaveValue(url);
    await usuario.click(screen.getByRole("button", { name: "Copiar link" }));
    expect(escrever).toHaveBeenCalledWith(url);
    expect(screen.getByRole("status")).toHaveTextContent("Link copiado!");

    const whatsapp = screen.getByRole("link", { name: "Enviar no WhatsApp" });
    const texto = decodeURIComponent(whatsapp.getAttribute("href")!.split("?text=")[1]!);
    expect(texto).toBe(`Vamos escolher o filme de hoje juntos? Responde aqui:\n${url}`);
  });

  it("se a cópia falhar, pede para copiar à mão", async () => {
    const usuario = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("negado"));
    render(<LinkSala sala={SALA} />);

    await usuario.click(screen.getByRole("button", { name: "Copiar link" }));
    expect(screen.getByRole("status")).toHaveTextContent("Selecione o link acima");
  });
});

describe("EsperandoSala", () => {
  it("atualiza a página periodicamente até sair da tela", () => {
    vi.useFakeTimers();
    const { unmount } = render(<EsperandoSala />);
    expect(screen.getByRole("status")).toHaveTextContent("Esperando a outra pessoa responder");

    act(() => vi.advanceTimersByTime(INTERVALO_SALA_MS * 2));
    expect(router.refresh).toHaveBeenCalledTimes(2);

    unmount();
    act(() => vi.advanceTimersByTime(INTERVALO_SALA_MS * 3));
    expect(router.refresh).toHaveBeenCalledTimes(2);
  });
});

describe("MontarSala", () => {
  it("monta uma vez e recarrega a página", async () => {
    vi.mocked(montarSala).mockResolvedValue({ ok: true });
    render(<MontarSala sala={SALA} />);

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(montarSala).toHaveBeenCalledExactlyOnceWith(SALA);
  });

  it("com falha, mostra o porquê e tenta de novo", async () => {
    vi.mocked(montarSala).mockResolvedValueOnce({ ok: false, mensagem: "TMDB fora do ar." });
    vi.mocked(montarSala).mockResolvedValueOnce({ ok: true });
    render(<MontarSala sala={SALA} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("TMDB fora do ar.");
    expect(router.refresh).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(montarSala).toHaveBeenCalledTimes(2);
  });
});

describe("EnviarRespostas", () => {
  it("mostra o resumo e envia as respostas da pessoa", async () => {
    vi.mocked(responderSala).mockResolvedValue({ mensagem: "Essa sala já foi encerrada." });
    const respostas = { humor: "cansado", experiencia: "rir", companhia: "a-dois" } as const;
    render(<EnviarRespostas sala={SALA} respostas={respostas} />);

    expect(screen.getByText("Cansado · Rir · A dois")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Enviar respostas" }));

    expect(responderSala).toHaveBeenCalledWith(SALA, respostas);
    expect(await screen.findByRole("alert")).toHaveTextContent("Essa sala já foi encerrada.");
  });
});
