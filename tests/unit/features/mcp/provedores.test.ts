// Teste de aceitação do loop da aula 7 (loop/PROMPT.md). O agente não pode editar este arquivo.
import { describe, expect, it } from "vitest";

import { detalhesFilme } from "@/features/mcp/tools/detalhes-filme";

import { contexto, dadosFalsos, detalhes } from "./fakes";

const json = (r: { content: { text: string }[] }) => JSON.parse(r.content[0].text);
const p = (id: number, nome: string) => ({ id, nome, logoPath: null });

const onde = {
  link: "x",
  assinatura: [
    p(8, "Netflix"),
    p(1796, "Netflix Standard with Ads"),
    p(531, "Paramount Plus"),
    p(582, "Paramount+ Amazon Channel"),
    p(2303, "Paramount Plus Premium"),
    p(350, "Apple TV+"),
    p(119, "Prime Video"),
  ],
  aluguel: [p(3, "Google Play Movies"), p(3, "Google Play Movies"), p(10, "Amazon Video")],
  compra: [p(2, "Apple TV"), p(10, "amazon video")],
};

async function executar(streamings: number[]) {
  const preferencias = { generos: [18], generosEvitados: [], duracao: "media" as const, frequencia: "semanal" as const, streamings };
  const ctx = contexto({ dados: dadosFalsos({ preferencias: async () => preferencias }) });
  ctx.tmdb.obterFilme = async (id: number) => detalhes(id, { ondeAssistir: onde });
  return json(await detalhesFilme.executar({ tmdb_id: 9 }, ctx));
}

describe("detalhes_filme agrupa variantes de provedor", () => {
  it("mantém um nome por serviço, na ordem do TMDB", async () => {
    const r = await executar([]);
    expect(r.onde_assistir.assinatura).toEqual(["Netflix", "Paramount Plus", "Apple TV+", "Prime Video"]);
  });

  it("agrupa também aluguel e compra, sem juntar serviços diferentes", async () => {
    const r = await executar([]);
    expect(r.onde_assistir.aluguel).toEqual(["Google Play Movies", "Amazon Video"]);
    expect(r.onde_assistir.compra).toEqual(["Apple TV", "amazon video"]);
  });

  it("nos_meus_streamings mostra o nome do grupo uma vez", async () => {
    const r = await executar([1796, 8, 582, 119]);
    expect(r.nos_meus_streamings).toEqual(["Netflix", "Paramount Plus", "Prime Video"]);
  });
});
