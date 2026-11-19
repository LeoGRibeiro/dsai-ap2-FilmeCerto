import {
  CLIMAS,
  climaSchema,
  MAX_TROCAS,
  type Clima,
  MOTIVOS_TROCA,
  type Pergunta,
} from "@/features/metricas/eventos";
import { MAPEAMENTOS } from "@/features/noite/filtros";
import { TOTAL_TONS } from "@/features/noite/mapeamento";
import { HORAS_LIMITE, PERGUNTAS, type HoraLimite } from "@/features/noite/opcoes";
import { minutosAte } from "@/features/noite/termina";
import { limparIds } from "@/features/surpresa/memoria";
import type { TipoMidia } from "@/lib/midia";

export type MotivoTroca = (typeof MOTIVOS_TROCA)[number];

/** Tudo o que o wizard sabe, guardado só na URL de `/noite`. */
export type EstadoNoite = {
  /** "Filme ou série?": filme quando a URL não diz (SPEC/2026-11-18-series-noite.md). */
  tipo: TipoMidia;
  respostas: Partial<Clima>;
  tom: number;
  /** Limite de duração vindo de "Muito longo". */
  duracaoMax: number | null;
  /** IDs já mostrados nesta sessão do wizard. */
  vistos: number[];
  trocas: number;
  /** "Até que horas?": a hora escolhida, ou `null` para "Tanto faz". Sempre junto de `tempo`. */
  ate: HoraLimite | null;
  /** Minutos que faltavam até `ate`, calculados no navegador da pessoa. */
  tempo: number | null;
};

export const ROTA_NOITE = "/noite";
/** A sala da "Noite a dois" (SPEC/2026-11-18-noite-a-dois.md). */
export const rotaDaSala = (sala: string) => `${ROTA_NOITE}/juntos/${sala}`;
export const MAX_VISTOS_NOITE = 50;
const DURACAO_MAXIMA_URL = 600;
const TEMPO_MAXIMO_URL = 24 * 60;

export const ESTADO_INICIAL: EstadoNoite = {
  tipo: "filme",
  respostas: {},
  tom: 0,
  duracaoMax: null,
  vistos: [],
  trocas: 0,
  ate: null,
  tempo: null,
};

type Busca = Record<string, string | string[] | undefined>;

function texto(valor: string | string[] | undefined): string | undefined {
  return typeof valor === "string" ? valor : undefined;
}

function inteiro(valor: string | string[] | undefined, min: number, max: number): number | null {
  const bruto = texto(valor);
  if (!bruto || !/^\d{1,4}$/.test(bruto)) return null;
  const numero = Number(bruto);
  return numero >= min && numero <= max ? numero : null;
}

function resposta<P extends Pergunta>(pergunta: P, valor: string | undefined) {
  return (CLIMAS[pergunta] as readonly string[]).includes(valor ?? "")
    ? (valor as Clima[P])
    : undefined;
}

/** Lê o estado dos `searchParams` de `/noite`; valores inválidos são ignorados. */
export function lerEstado(busca: Busca): EstadoNoite {
  const tipo: TipoMidia = texto(busca.tipo) === "serie" ? "serie" : "filme";
  const respostas: Partial<Clima> = {};
  for (const { chave, parametro } of PERGUNTAS) {
    const valor = resposta(chave, texto(busca[parametro]));
    if (valor) Object.assign(respostas, { [chave]: valor });
  }
  const vistos = (texto(busca.vistos) ?? "").split(",").filter(Boolean).map(Number);
  const hora = inteiro(busca.ate, 0, 23);
  const ate = HORAS_LIMITE.find((h) => h === hora) ?? null;
  const tempo = inteiro(busca.tempo, 0, TEMPO_MAXIMO_URL);
  // A hora e os minutos só valem juntos: sem um deles, é "Tanto faz".
  const horario = ate !== null && tempo !== null ? { ate, tempo } : { ate: null, tempo: null };

  return {
    tipo,
    respostas,
    tom: inteiro(busca.tom, 0, TOTAL_TONS - 1) ?? 0,
    duracaoMax: inteiro(busca.max, MAPEAMENTOS[tipo].duracaoTroca.minima, DURACAO_MAXIMA_URL),
    vistos: limparIds(vistos).slice(-MAX_VISTOS_NOITE),
    trocas: inteiro(busca.trocas, 0, MAX_TROCAS) ?? 0,
    ...horario,
  };
}

/** A próxima pergunta sem resposta, na ordem das telas, ou `null` com as três respondidas. */
export function proximaPergunta(estado: EstadoNoite): (typeof PERGUNTAS)[number] | null {
  return PERGUNTAS.find(({ chave }) => !estado.respostas[chave]) ?? null;
}

/** As três respostas, quando completas e válidas. */
export function respostasCompletas(estado: EstadoNoite): Clima | null {
  const resultado = climaSchema.safeParse(estado.respostas);
  return resultado.success ? resultado.data : null;
}

/** URL de `/noite` (ou de `rota`) para o estado, só com os parâmetros que fogem do padrão. */
export function urlDaNoite(estado: EstadoNoite, rota = ROTA_NOITE): string {
  const busca = new URLSearchParams();
  if (estado.tipo === "serie") busca.set("tipo", "serie");
  for (const { chave, parametro } of PERGUNTAS) {
    const valor = estado.respostas[chave];
    if (valor) busca.set(parametro, valor);
  }
  if (estado.ate !== null && estado.tempo !== null) {
    busca.set("ate", String(estado.ate));
    busca.set("tempo", String(estado.tempo));
  }
  if (estado.tom > 0) busca.set("tom", String(estado.tom));
  if (estado.duracaoMax !== null) busca.set("max", String(estado.duracaoMax));
  if (estado.vistos.length > 0) busca.set("vistos", estado.vistos.join(","));
  if (estado.trocas > 0) busca.set("trocas", String(estado.trocas));
  const consulta = busca.toString().replaceAll("%2C", ",");
  return consulta ? `${rota}?${consulta}` : rota;
}

/** URL com mais uma resposta: o cartão de cada opção do wizard é um link para ela. */
export function urlComResposta<P extends Pergunta>(
  estado: EstadoNoite,
  pergunta: P,
  valor: Clima[P],
  rota = ROTA_NOITE,
): string {
  return urlDaNoite({ ...estado, respostas: { ...estado.respostas, [pergunta]: valor } }, rota);
}

/** "Refazer as perguntas": a primeira pergunta, mantendo filme ou série. */
export function inicioDaNoite(tipo: TipoMidia): string {
  return urlDaNoite({ ...ESTADO_INICIAL, tipo });
}

/**
 * "Até que horas?": o mesmo estado com a hora escolhida e os minutos que faltam no relógio
 * `agora` (o do navegador). `null` é "Tanto faz". Não é troca: o resto do estado fica igual.
 */
export function comHorario(estado: EstadoNoite, hora: HoraLimite | null, agora: Date): EstadoNoite {
  if (hora === null) return { ...estado, ate: null, tempo: null };
  return { ...estado, ate: hora, tempo: minutosAte(hora, agora) };
}

/**
 * Encurta o limite de duração depois de "Muito longo" (tabela de precedência da spec). Para
 * série, a duração é a do episódio, com a redução, o piso e a base do mapeamento de série.
 */
function encurtar(tipo: TipoMidia, atual: number | null, duracaoRecusada: number | null): number {
  const { reducao, minima, base } = MAPEAMENTOS[tipo].duracaoTroca;
  const novo = (duracaoRecusada ?? atual ?? base) - reducao;
  return Math.max(minima, Math.min(novo, atual ?? novo));
}

/**
 * Estado da próxima rodada depois de "Esse não": os filmes mostrados entram em `vistos`,
 * o motivo ajusta o tom ou a duração e `trocas` sobe. `null` quando já não há trocas.
 * `mostrados[0]` é o destaque recusado.
 */
export function proximaRodada(
  estado: EstadoNoite,
  motivo: MotivoTroca,
  mostrados: { id: number; duracaoMin: number | null }[],
): EstadoNoite | null {
  if (estado.trocas >= MAX_TROCAS) return null;
  const vistos = limparIds([...estado.vistos, ...mostrados.map(({ id }) => id)]);

  return {
    ...estado,
    vistos: vistos.slice(-MAX_VISTOS_NOITE),
    trocas: estado.trocas + 1,
    tom: motivo === "nao-e-o-clima" ? (estado.tom + 1) % TOTAL_TONS : estado.tom,
    duracaoMax:
      motivo === "muito-longo"
        ? encurtar(estado.tipo, estado.duracaoMax, mostrados[0]?.duracaoMin ?? null)
        : estado.duracaoMax,
  };
}

/** URL da próxima rodada para cada motivo de "Esse não", ou `null` sem trocas restantes. */
export function urlsDaTroca(
  estado: EstadoNoite,
  mostrados: { id: number; duracaoMin: number | null }[],
): Record<MotivoTroca, string> | null {
  const urls = {} as Record<MotivoTroca, string>;
  for (const motivo of MOTIVOS_TROCA) {
    const proxima = proximaRodada(estado, motivo, mostrados);
    if (!proxima) return null;
    urls[motivo] = urlDaNoite(proxima);
  }
  return urls;
}
