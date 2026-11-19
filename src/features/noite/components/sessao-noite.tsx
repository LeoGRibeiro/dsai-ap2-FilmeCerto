"use client";

import { useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";

import { enviarEvento } from "@/features/metricas/enviar";
import type { Clima, ETAPAS_WIZARD } from "@/features/metricas/eventos";
import { concluirNoite } from "@/features/noite/actions";
import { lerEstado, proximaPergunta } from "@/features/noite/estado";

type Etapa = (typeof ETAPAS_WIZARD)[number];

export type SessaoDaNoite = {
  /** `wizard_concluido` e a contagem de climas, uma vez por sessão do wizard. */
  concluir: (respostas: Clima) => void;
  /** "Vou ver esse!": a partir daqui, sair da página não é abandono. */
  marcarEscolha: () => void;
};

const Contexto = createContext<SessaoDaNoite>({ concluir: () => {}, marcarEscolha: () => {} });

export function useSessaoNoite(): SessaoDaNoite {
  return useContext(Contexto);
}

type Memoria = {
  etapa: Etapa;
  iniciado: boolean;
  chegouAoResultado: boolean;
  concluido: boolean;
  escolheu: boolean;
  abandonou: boolean;
  montado: boolean;
};

/**
 * Sessão do wizard no navegador, no layout de `/noite`: o layout não é remontado entre as
 * telas, então a memória sobrevive a cada resposta e troca (só a página muda com a URL).
 * Emite `wizard_iniciado` e `wizard_abandonado` (SPEC/2026-11-18-wizard-noite.md, "Eventos").
 */
export function SessaoNoite({ children }: { children: ReactNode }) {
  const busca = useSearchParams();
  const estado = lerEstado(Object.fromEntries(busca));
  const semRespostas = Object.keys(estado.respostas).length === 0;
  const etapa: Etapa = proximaPergunta(estado) ? "perguntas" : "resultado";
  const memoria = useRef<Memoria>({
    etapa,
    iniciado: false,
    chegouAoResultado: false,
    concluido: false,
    escolheu: false,
    abandonou: false,
    montado: false,
  });

  useEffect(() => {
    const atual = memoria.current;
    atual.etapa = etapa;
    if (etapa === "resultado") atual.chegouAoResultado = true;
    // Voltar à 1ª pergunta no meio das respostas não é um novo início; refazer depois do resultado é.
    if (!semRespostas || (atual.iniciado && !atual.chegouAoResultado)) return;
    Object.assign(atual, {
      iniciado: true,
      chegouAoResultado: false,
      concluido: false,
      escolheu: false,
      abandonou: false,
    });
    enviarEvento({ nome: "wizard_iniciado" });
  }, [etapa, semRespostas]);

  useEffect(() => {
    const atual = memoria.current;
    atual.montado = true;
    function abandonar() {
      if (atual.escolheu || atual.abandonou) return;
      atual.abandonou = true;
      enviarEvento({ nome: "wizard_abandonado", dados: { etapa: atual.etapa } });
    }
    window.addEventListener("pagehide", abandonar);
    return () => {
      atual.montado = false;
      window.removeEventListener("pagehide", abandonar);
      // Em desenvolvimento, o React desmonta e monta de novo na hora: só uma saída de verdade conta.
      setTimeout(() => {
        if (!atual.montado) abandonar();
      }, 0);
    };
  }, []);

  const sessao = useMemo<SessaoDaNoite>(
    () => ({
      concluir(respostas) {
        if (memoria.current.concluido) return;
        memoria.current.concluido = true;
        void concluirNoite(respostas);
      },
      marcarEscolha() {
        memoria.current.escolheu = true;
      },
    }),
    [],
  );

  return <Contexto value={sessao}>{children}</Contexto>;
}
