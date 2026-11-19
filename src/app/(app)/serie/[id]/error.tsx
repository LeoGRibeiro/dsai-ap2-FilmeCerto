"use client";

import { ErroAoCarregar } from "@/features/filme/components/erro-ao-carregar";

export default function ErroSerie({ retry }: { error: Error; retry: () => void }) {
  return <ErroAoCarregar titulo="Não foi possível carregar esta série agora." retry={retry} />;
}
