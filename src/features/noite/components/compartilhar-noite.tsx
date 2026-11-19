"use client";

import { Share2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { linkWhatsApp, mensagemDaNoite, urlDoFilme } from "@/features/noite/compartilhar";
import { aCadaMeioMinuto } from "@/features/noite/components/termina-as";
import type { TipoMidia } from "@/lib/midia";

const ESTILO = "h-12 px-6 text-base";

/** O suporte à Web Share não muda enquanto a página está aberta. */
const semMudancas = () => () => {};
const temWebShare = () => typeof navigator.share === "function";

/**
 * Depois do "Vou ver esse!": avisa quem vai assistir junto, com "Hoje vamos ver {título},
 * termina às {hora}" e o link do filme (SPEC/2026-11-18-noite-compartilhar.md). Usa a
 * folha de compartilhamento do aparelho e, sem ela, um link do WhatsApp. Não grava nada.
 */
export function CompartilharNoite({
  tipo = "filme",
  tmdbId,
  titulo,
  duracaoMin,
}: {
  /** Filme (o padrão) ou série: muda o link e diz "um episódio de". */
  tipo?: TipoMidia;
  tmdbId: number;
  titulo: string;
  duracaoMin: number | null;
}) {
  const webShare = useSyncExternalStore(semMudancas, temWebShare, () => false);
  // O href acompanha o relógio, como o "Começando agora, termina às…" da tela.
  const mensagem = useSyncExternalStore(
    aCadaMeioMinuto,
    () => mensagemDaNoite(titulo, duracaoMin, new Date(), tipo),
    () => null,
  );
  const [falhou, setFalhou] = useState(false);
  if (mensagem === null) return null;

  const url = urlDoFilme(window.location.origin, tmdbId, tipo);

  async function compartilhar() {
    try {
      await navigator.share({ text: mensagemDaNoite(titulo, duracaoMin, new Date(), tipo), url });
    } catch (erro) {
      // Cancelar a folha de compartilhamento não é erro.
      if (erro instanceof DOMException && erro.name === "AbortError") return;
      setFalhou(true);
    }
  }

  if (webShare && !falhou) {
    return (
      <Button variant="outline" size="lg" className={ESTILO} onClick={compartilhar}>
        <Share2 aria-hidden="true" />
        Compartilhar
      </Button>
    );
  }

  return (
    <a
      href={linkWhatsApp(mensagem, url)}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonVariants({ variant: "outline", size: "lg", className: ESTILO })}
    >
      <Share2 aria-hidden="true" />
      Compartilhar no WhatsApp
    </a>
  );
}
