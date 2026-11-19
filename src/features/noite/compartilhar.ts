import { terminaAs } from "@/features/noite/termina";

/**
 * "Hoje vamos ver {título}, termina às {hora}" (SPEC/2026-11-18-noite-compartilhar.md).
 * Sem duração conhecida, sem a hora. Como `terminaAs`, use no navegador: vale o fuso da pessoa.
 */
export function mensagemDaNoite(titulo: string, duracaoMin: number | null, agora: Date): string {
  const mensagem = `Hoje vamos ver ${titulo}`;
  return duracaoMin ? `${mensagem}, termina às ${terminaAs(agora, duracaoMin)}` : mensagem;
}

/** URL absoluta da página do filme, a partir da origem em que o app está aberto. */
export function urlDoFilme(origem: string, tmdbId: number): string {
  return `${origem}/filme/${tmdbId}`;
}

/** Link do WhatsApp com a mensagem e, na linha de baixo, o link do filme, tudo codificado. */
export function linkWhatsApp(mensagem: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${mensagem}\n${url}`)}`;
}
