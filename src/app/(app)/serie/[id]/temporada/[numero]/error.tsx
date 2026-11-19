"use client";

import { ErroAoCarregar } from "@/features/filme/components/erro-ao-carregar";

export default function ErroTemporada({ retry }: { error: Error; retry: () => void }) {
  return <ErroAoCarregar titulo="Não foi possível carregar esta temporada agora." retry={retry} />;
}
