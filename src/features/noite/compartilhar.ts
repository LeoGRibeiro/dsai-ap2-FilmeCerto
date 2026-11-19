import { terminaAs } from "@/features/noite/termina";
import { caminhoMidia, type TipoMidia } from "@/lib/midia";

/**
 * "Hoje vamos ver {título}, termina às {hora}" (SPEC/2026-11-18-noite-compartilhar.md); de uma
 * série, "um episódio de {título}", com a hora do fim do episódio. Sem duração conhecida, sem a
 * hora. Como `terminaAs`, use no navegador: vale o fuso da pessoa.
 */
export function mensagemDaNoite(
  titulo: string,
  duracaoMin: number | null,
  agora: Date,
  tipo: TipoMidia = "filme",
): string {
  const mensagem = `Hoje vamos ver ${tipo === "serie" ? "um episódio de " : ""}${titulo}`;
  return duracaoMin ? `${mensagem}, termina às ${terminaAs(agora, duracaoMin)}` : mensagem;
}

/** URL absoluta da página do filme (ou da série), a partir da origem em que o app está aberto. */
export function urlDoFilme(origem: string, tmdbId: number, tipo: TipoMidia = "filme"): string {
  return `${origem}${caminhoMidia({ tipo, tmdbId })}`;
}

/** Link do WhatsApp com a mensagem e, na linha de baixo, o link do filme, tudo codificado. */
export function linkWhatsApp(mensagem: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${mensagem}\n${url}`)}`;
}
