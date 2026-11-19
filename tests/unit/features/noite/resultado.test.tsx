import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ErroNoite from "@/app/(app)/noite/error";
import { escolherFilme } from "@/features/como-foi/actions";
import { enviarEvento } from "@/features/metricas/enviar";
import type { Clima } from "@/features/metricas/eventos";
import { FilmeDestaque, type FilmeNaTela } from "@/features/noite/components/filme-destaque";
import { paraTela, RecomendacaoNoite } from "@/features/noite/components/recomendacao-noite";
import { ResultadoNoite } from "@/features/noite/components/resultado-noite";
import { TerminaAs } from "@/features/noite/components/termina-as";
import { obterNoite } from "@/features/noite/consultas";
import { ESTADO_INICIAL } from "@/features/noite/estado";
import type { FilmeDaNoite } from "@/features/noite/recomendar";
import type { FilmeDetalhes } from "@/lib/tmdb/tipos";

const { sessao, router } = vi.hoisted(() => ({
  sessao: { concluir: vi.fn(), marcarEscolha: vi.fn() },
  router: { push: vi.fn() },
}));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/features/metricas/enviar", () => ({ enviarEvento: vi.fn() }));
vi.mock("@/features/noite/consultas", () => ({ obterNoite: vi.fn() }));
vi.mock("@/features/como-foi/actions", () => ({ escolherFilme: vi.fn(async () => ({})) }));
vi.mock("@/features/noite/components/sessao-noite", () => ({ useSessaoNoite: () => sessao }));

const NETFLIX = { id: 8, nome: "Netflix", logoPath: null };
const respostas: Clima = { humor: "cansado", experiencia: "rir", companhia: "a-dois" };
const perfil = { generosEvitados: [], streamings: [8] };
const MOTIVO =
  "Você está cansado, quer rir e vai ver a dois: comédia leve, nota 7,8, está na Netflix.";

function naTela(sobrescrever: Partial<FilmeNaTela> = {}): FilmeNaTela {
  return {
    id: 10,
    titulo: "Amor à Primeira Risada",
    ano: 2019,
    posterPath: "/p10.jpg",
    sinopse: "Dois vizinhos brigam por uma vaga.",
    duracaoMin: 115,
    trailerYoutube: "abc123",
    motivo: MOTIVO,
    provedor: NETFLIX,
    ...sobrescrever,
  };
}

function daNoite(id: number): FilmeDaNoite {
  const filme: FilmeDetalhes = {
    ...naTela({ id, titulo: `Filme ${id}` }),
    tituloOriginal: "",
    backdropPath: null,
    generos: [{ id: 35, nome: "Comédia" }],
    nota: 7.8,
    votos: 900,
    popularidade: 1,
    slogan: null,
    elenco: [{ nome: "Atriz", personagem: "Ela", fotoPath: null }],
    direcao: ["Diretora"],
    ondeAssistir: null,
    parecidos: [],
  };
  return { filme, provedor: NETFLIX, motivo: MOTIVO };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("TerminaAs", () => {
  it("soma a duração à hora do navegador e acompanha o relógio", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 18, 21, 45));
    render(<TerminaAs duracaoMin={115} />);

    expect(screen.getByText("Começando agora, termina às 23h40")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(5 * 60_000));
    expect(screen.getByText("Começando agora, termina às 23h45")).toBeInTheDocument();
  });
});

describe("TerminaAs de série", () => {
  it("diz que é o episódio que termina", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 18, 23, 30));
    render(<TerminaAs duracaoMin={45} episodio />);

    expect(screen.getByText("Começando agora, o episódio termina às 0h15")).toBeInTheDocument();
  });
});

describe("FilmeDestaque", () => {
  it("mostra título, ano e duração, onde assistir, motivo, sinopse e o trailer da noite", async () => {
    render(<FilmeDestaque filme={naTela()} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Amor à Primeira Risada");
    expect(screen.getByText("2019 · 1h 55min")).toBeInTheDocument();
    expect(screen.getByText("Onde assistir: Netflix")).toBeInTheDocument();
    expect(screen.getByText(/^Começando agora, termina às \d{1,2}h\d{2}$/)).toBeInTheDocument();
    expect(screen.getByTestId("motivo-noite")).toHaveTextContent(MOTIVO);
    expect(screen.getByText("Dois vizinhos brigam por uma vaga.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Assistir trailer/ }));
    expect(enviarEvento).toHaveBeenCalledExactlyOnceWith({
      nome: "trailer_aberto",
      dados: { origem: "noite" },
    });
  });

  it("de uma série, mostra 'A série da sua noite' e a duração do episódio", () => {
    render(<FilmeDestaque filme={naTela({ tipo: "serie", titulo: "Dark", duracaoMin: 45 })} />);

    expect(screen.getByText("A série da sua noite")).toBeInTheDocument();
    expect(screen.queryByText("O filme da sua noite")).not.toBeInTheDocument();
    expect(screen.getByText("2019 · Episódios de ~45 min")).toBeInTheDocument();
    expect(
      screen.getByText(/^Começando agora, o episódio termina às \d{1,2}h\d{2}$/),
    ).toBeInTheDocument();
  });

  it("sem duração, trailer, streaming e pôster, mostra só o que tem", () => {
    const filme = naTela({
      duracaoMin: null,
      trailerYoutube: null,
      provedor: null,
      posterPath: null,
    });
    const { container } = render(<FilmeDestaque filme={filme} />);

    expect(screen.getByText("2019")).toBeInTheDocument();
    expect(screen.queryByText(/termina às/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Onde assistir/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /trailer/ })).not.toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("ResultadoNoite", () => {
  const PROXIMAS = { "ja-vi": "/a", "nao-e-o-clima": "/b", "muito-longo": "/c", outro: "/d" };
  const opcoesBC = [naTela({ id: 11, titulo: "Opção B" }), naTela({ id: 12, titulo: "Opção C" })];
  const resultado = (trocas: number, opcoes: FilmeNaTela[] = [], proximas = PROXIMAS) => (
    <ResultadoNoite
      respostas={respostas}
      trocas={trocas}
      destaque={naTela()}
      opcoes={opcoes}
      proximas={proximas}
    />
  );

  it("na primeira rodada, conclui o wizard com as respostas", () => {
    render(resultado(0));

    expect(sessao.concluir).toHaveBeenCalledExactlyOnceWith(respostas);
    expect(screen.queryByRole("region", { name: "Ou talvez" })).not.toBeInTheDocument();
  });

  it("depois de uma troca, não conclui de novo e mostra as 2 opções menores", () => {
    render(resultado(1, opcoesBC));

    expect(sessao.concluir).not.toHaveBeenCalled();
    const opcoes = screen.getByRole("region", { name: "Ou talvez" });
    expect(
      within(opcoes)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(["Opção B", "Opção C"]);
  });

  it("'Vou ver esse!' no destaque guarda a escolha e tira 'Esse não' e as outras opções", async () => {
    render(resultado(2, opcoesBC));
    expect(screen.getAllByRole("button", { name: "Vou ver esse!" })).toHaveLength(3);

    await userEvent.click(screen.getAllByRole("button", { name: "Vou ver esse!" })[0]!);

    expect(await screen.findByRole("status")).toHaveTextContent("Boa sessão!");
    expect(escolherFilme).toHaveBeenCalledExactlyOnceWith(10, "filme");
    expect(enviarEvento).toHaveBeenCalledWith({ nome: "wizard_escolheu", dados: { trocas: 2 } });
    expect(sessao.marcarEscolha).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Vou ver esse!" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Esse não" })).not.toBeInTheDocument();
  });

  it("dá para escolher uma das opções menores", async () => {
    render(resultado(1, opcoesBC));
    const opcao = screen.getByRole("article", { name: "Opção C" });

    await userEvent.click(within(opcao).getByRole("button", { name: "Vou ver esse!" }));

    expect(await within(opcao).findByRole("status")).toHaveTextContent("Boa sessão!");
    expect(escolherFilme).toHaveBeenCalledExactlyOnceWith(12, "filme");
    expect(screen.queryByRole("button", { name: "Vou ver esse!" })).not.toBeInTheDocument();
  });

  it("de uma série, escolhe a série e compartilha um episódio dela", async () => {
    render(
      <ResultadoNoite
        respostas={respostas}
        trocas={0}
        destaque={naTela({ tipo: "serie", id: 77, titulo: "Dark", duracaoMin: 50 })}
        opcoes={[]}
        proximas={PROXIMAS}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Vou ver esse!" }));

    expect(escolherFilme).toHaveBeenCalledExactlyOnceWith(77, "serie");
    expect(await screen.findByRole("link", { name: "Ver detalhes de Dark" })).toHaveAttribute(
      "href",
      "/serie/77",
    );
    const link = screen.getByRole("link", { name: "Compartilhar no WhatsApp" });
    const texto = new URL(link.getAttribute("href")!).searchParams.get("text");
    expect(texto).toMatch(/^Hoje vamos ver um episódio de Dark, termina às \d{1,2}h\d{2}\n/);
    expect(texto).toMatch(/\/serie\/77$/);
  });

  it("só depois do 'Vou ver esse!' oferece compartilhar o filme escolhido", async () => {
    render(resultado(1, opcoesBC));
    expect(screen.queryByRole("link", { name: /Compartilhar/ })).not.toBeInTheDocument();
    const opcao = screen.getByRole("article", { name: "Opção C" });

    await userEvent.click(within(opcao).getByRole("button", { name: "Vou ver esse!" }));

    const links = await screen.findAllByRole("link", { name: "Compartilhar no WhatsApp" });
    expect(links).toHaveLength(1);
    expect(opcao).toContainElement(links[0]!);
    const texto = new URL(links[0]!.getAttribute("href")!).searchParams.get("text");
    expect(texto).toMatch(/^Hoje vamos ver Opção C, termina às \d{1,2}h\d{2}\n/);
    expect(texto).toMatch(/\/filme\/12$/);
  });
});

describe("RecomendacaoNoite", () => {
  beforeEach(() => {
    vi.mocked(obterNoite).mockResolvedValue(null);
  });

  it("busca a rodada com as respostas, o estado e o perfil, e mostra o destaque", async () => {
    vi.mocked(obterNoite).mockResolvedValue({ destaque: daNoite(10), opcoes: [] });

    render(await RecomendacaoNoite({ respostas, estado: ESTADO_INICIAL, perfil }));

    expect(obterNoite).toHaveBeenCalledExactlyOnceWith(respostas, ESTADO_INICIAL, perfil);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Filme 10");
  });

  it("'Esse não' recusa o destaque e as opções e passa para a próxima rodada", async () => {
    vi.mocked(obterNoite).mockResolvedValue({
      destaque: daNoite(10),
      opcoes: [daNoite(11), daNoite(12)],
    });
    const estado = { ...ESTADO_INICIAL, respostas, vistos: [5], trocas: 1 };
    render(await RecomendacaoNoite({ respostas, estado, perfil }));

    await userEvent.click(screen.getByRole("button", { name: "Esse não" }));
    await userEvent.click(screen.getByRole("button", { name: "Outro" }));

    expect(router.push).toHaveBeenCalledExactlyOnceWith(
      "/noite?humor=cansado&exp=rir&com=a-dois&vistos=5,10,11,12&trocas=2",
    );
  });

  it("sem filme, diz que não achou nada e oferece refazer as perguntas", async () => {
    render(await RecomendacaoNoite({ respostas, estado: ESTADO_INICIAL, perfil }));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Não achamos nada para essa noite",
    );
    expect(screen.getByRole("link", { name: "Refazer as perguntas" })).toHaveAttribute(
      "href",
      "/noite",
    );
  });

  it("de uma série, mostra a série e manda o tipo para a tela", async () => {
    vi.mocked(obterNoite).mockResolvedValue({ destaque: daNoite(10), opcoes: [] });
    const estado = { ...ESTADO_INICIAL, tipo: "serie" as const, respostas };

    render(await RecomendacaoNoite({ respostas, estado, perfil }));

    expect(screen.getByText("A série da sua noite")).toBeInTheDocument();
    expect(paraTela(daNoite(10), "serie").tipo).toBe("serie");
  });

  it("sem série, diz 'nenhuma série' e refaz as perguntas de série", async () => {
    const estado = { ...ESTADO_INICIAL, tipo: "serie" as const, respostas };
    render(await RecomendacaoNoite({ respostas, estado, perfil }));

    expect(screen.getByText(/não sobrou nenhuma série/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Refazer as perguntas" })).toHaveAttribute(
      "href",
      "/noite?tipo=serie",
    );
  });

  it("para série, o mínimo do 'Até que horas?' é de 20 minutos de episódio", async () => {
    const serie = { ...ESTADO_INICIAL, tipo: "serie" as const, respostas, ate: 23 as const };

    render(await RecomendacaoNoite({ respostas, estado: { ...serie, tempo: 15 }, perfil }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Não dá tempo de ver um episódio até as 23h",
    );
    expect(obterNoite).not.toHaveBeenCalled();

    await RecomendacaoNoite({ respostas, estado: { ...serie, tempo: 30 }, perfil });
    expect(obterNoite).toHaveBeenCalledOnce();
  });

  it("sem tempo até o horário escolhido, nem consulta o TMDB e oferece 'Tanto faz'", async () => {
    const estado = { ...ESTADO_INICIAL, respostas, trocas: 2, ate: 23 as const, tempo: 0 };
    render(await RecomendacaoNoite({ respostas, estado, perfil }));

    expect(obterNoite).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Não dá tempo de ver um filme até as 23h",
    );
    expect(screen.getByText(/^Esse horário já passou\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tanto faz o horário" })).toHaveAttribute(
      "href",
      "/noite?humor=cansado&exp=rir&com=a-dois&trocas=2",
    );
    expect(screen.getByRole("link", { name: "Refazer as perguntas" })).toHaveAttribute(
      "href",
      "/noite",
    );
  });

  it.each([
    [30, 0, "até a meia-noite", /^Faltam só 30 minutos\./],
    [1, 22, "até as 22h", /^Faltam só 1 minuto\./],
  ] as const)("com %i min, diz quanto falta", async (tempo, ate, trecho, falta) => {
    const estado = { ...ESTADO_INICIAL, respostas, ate, tempo };
    render(await RecomendacaoNoite({ respostas, estado, perfil }));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(trecho);
    expect(screen.getByText(falta)).toBeInTheDocument();
    expect(obterNoite).not.toHaveBeenCalled();
  });

  it("com tempo suficiente, busca a rodada com o horário", async () => {
    const estado = { ...ESTADO_INICIAL, respostas, ate: 23 as const, tempo: 60 };
    render(await RecomendacaoNoite({ respostas, estado, perfil }));

    expect(obterNoite).toHaveBeenCalledExactlyOnceWith(respostas, estado, perfil);
  });

  it("deixa o erro do TMDB subir para a página de erro", async () => {
    vi.mocked(obterNoite).mockRejectedValue(new Error("TMDB fora"));

    await expect(RecomendacaoNoite({ respostas, estado: ESTADO_INICIAL, perfil })).rejects.toThrow(
      "TMDB fora",
    );
  });

  it("manda ao navegador só os campos da tela", () => {
    expect(paraTela(daNoite(10))).toEqual(naTela({ tipo: "filme", titulo: "Filme 10" }));
  });
});

describe("ErroNoite", () => {
  it("oferece tentar de novo e voltar ao início", async () => {
    const retry = vi.fn();
    render(<ErroNoite error={new Error("x")} retry={retry} />);

    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Ir para o início" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});
