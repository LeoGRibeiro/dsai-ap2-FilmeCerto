import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { escolherFilme, exibirComoFoi, responderComoFoi } from "@/features/como-foi/actions";
import { PerguntaComoFoi } from "@/features/como-foi/components/pergunta-como-foi";
import { VouVerEsse } from "@/features/como-foi/components/vou-ver-esse";
import { enviarEvento } from "@/features/metricas/enviar";

vi.mock("@/features/como-foi/actions", () => ({
  escolherFilme: vi.fn(),
  exibirComoFoi: vi.fn(async () => {}),
  responderComoFoi: vi.fn(async () => ({})),
}));
vi.mock("@/features/metricas/enviar", () => ({ enviarEvento: vi.fn() }));

afterEach(() => vi.clearAllMocks());

const pergunta = { id: 7, tipo: "filme" as const, tmdbId: 550, titulo: "Clube da Luta" };

describe("PerguntaComoFoi", () => {
  it("pergunta pelo título, com as 4 respostas na ordem do cliente", () => {
    render(<PerguntaComoFoi pergunta={pergunta} />);

    expect(screen.getByRole("heading", { name: "Como foi Clube da Luta?" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clube da Luta" })).toHaveAttribute(
      "href",
      "/filme/550",
    );
    const botoes = screen.getByRole("group", { name: "Como foi?" }).querySelectorAll("button");
    expect([...botoes].map((b) => b.textContent)).toEqual([
      "Amei",
      "Gostei",
      "Não é pra mim",
      "Não cheguei a ver",
    ]);
  });

  it("de uma série, leva à página da série", () => {
    render(<PerguntaComoFoi pergunta={{ ...pergunta, tipo: "serie", titulo: "Dark" }} />);

    expect(screen.getByRole("heading", { name: "Como foi Dark?" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dark" })).toHaveAttribute("href", "/serie/550");
  });

  it("conta a exibição uma vez, mesmo renderizando de novo", () => {
    const { rerender } = render(<PerguntaComoFoi pergunta={pergunta} />);
    rerender(<PerguntaComoFoi pergunta={pergunta} />);

    expect(exibirComoFoi).toHaveBeenCalledExactlyOnceWith(7);
  });

  it("envia a escolha e a resposta do botão clicado", async () => {
    render(<PerguntaComoFoi pergunta={pergunta} />);

    await userEvent.click(screen.getByRole("button", { name: "Não cheguei a ver" }));

    const form = vi.mocked(responderComoFoi).mock.calls[0]![1];
    expect(Object.fromEntries(form)).toEqual({ id: "7", resposta: "nao-vi" });
  });

  it("mostra o erro da action", async () => {
    vi.mocked(responderComoFoi).mockResolvedValueOnce({ mensagem: "Deu ruim." });
    render(<PerguntaComoFoi pergunta={pergunta} />);

    await userEvent.click(screen.getByRole("button", { name: "Amei" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Deu ruim.");
  });

  it("'Agora não' esconde o cartão sem responder", async () => {
    render(<PerguntaComoFoi pergunta={pergunta} />);

    await userEvent.click(screen.getByRole("button", { name: "Agora não" }));

    expect(screen.queryByRole("heading", { name: /Como foi/ })).not.toBeInTheDocument();
    expect(responderComoFoi).not.toHaveBeenCalled();
  });
});

describe("VouVerEsse", () => {
  it("guarda a escolha, registra as trocas e mostra o link do filme", async () => {
    vi.mocked(escolherFilme).mockResolvedValue({});
    const aoEscolher = vi.fn();
    render(<VouVerEsse tmdbId={550} titulo="Clube da Luta" trocas={2} aoEscolher={aoEscolher} />);

    await userEvent.click(screen.getByRole("button", { name: "Vou ver esse!" }));

    expect(escolherFilme).toHaveBeenCalledExactlyOnceWith(550, "filme");
    expect(enviarEvento).toHaveBeenCalledExactlyOnceWith({
      nome: "wizard_escolheu",
      dados: { trocas: 2 },
    });
    expect(aoEscolher).toHaveBeenCalledOnce();
    expect(await screen.findByRole("status")).toHaveTextContent("Boa sessão!");
    expect(screen.getByRole("link", { name: "Ver detalhes de Clube da Luta" })).toHaveAttribute(
      "href",
      "/filme/550",
    );
  });

  it("de uma série, guarda a série e leva à página dela", async () => {
    vi.mocked(escolherFilme).mockResolvedValue({});
    render(<VouVerEsse tipo="serie" tmdbId={1399} titulo="Dark" trocas={0} />);

    await userEvent.click(screen.getByRole("button", { name: "Vou ver esse!" }));

    expect(escolherFilme).toHaveBeenCalledExactlyOnceWith(1399, "serie");
    expect(await screen.findByRole("link", { name: "Ver detalhes de Dark" })).toHaveAttribute(
      "href",
      "/serie/1399",
    );
  });

  it("se a gravação falha, mostra o erro e mantém o botão", async () => {
    vi.mocked(escolherFilme).mockResolvedValue({ mensagem: "Sua sessão expirou. Entre de novo." });
    render(<VouVerEsse tmdbId={550} titulo="Clube da Luta" trocas={0} />);

    await userEvent.click(screen.getByRole("button", { name: "Vou ver esse!" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Sua sessão expirou.");
    expect(screen.getByRole("button", { name: "Vou ver esse!" })).toBeEnabled();
    expect(enviarEvento).not.toHaveBeenCalled();
  });
});
