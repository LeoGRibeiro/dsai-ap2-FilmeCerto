"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";

/**
 * `Link` que só pré-carrega a rota quando a pessoa mostra intenção: mouse em cima, toque ou
 * foco pelo teclado. Com `loading.tsx`, todo link visível para uma rota dinâmica é pré-carregado,
 * e as dezenas de cartões do dashboard viravam dezenas de renderizações no servidor a cada
 * visita, atrasando a navegação de verdade (SPEC/2026-11-23-navegacao-rapida.md).
 * Padrão "Hover-triggered prefetch" do guia de prefetching do Next 16.
 */
export function LinkComIntencao({
  onMouseEnter,
  onTouchStart,
  onFocus,
  ...props
}: Omit<ComponentProps<typeof Link>, "prefetch">) {
  const [intencao, setIntencao] = useState(false);

  return (
    <Link
      {...props}
      // `null` devolve o pré-carregamento padrão; `false` desliga até a intenção.
      prefetch={intencao ? null : false}
      onMouseEnter={(evento) => {
        setIntencao(true);
        onMouseEnter?.(evento);
      }}
      onTouchStart={(evento) => {
        setIntencao(true);
        onTouchStart?.(evento);
      }}
      onFocus={(evento) => {
        setIntencao(true);
        onFocus?.(evento);
      }}
    />
  );
}
