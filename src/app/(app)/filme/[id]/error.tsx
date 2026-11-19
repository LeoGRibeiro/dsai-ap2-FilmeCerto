"use client";

import { ErroAoCarregar } from "@/features/filme/components/erro-ao-carregar";

export default function ErroFilme({ retry }: { error: Error; retry: () => void }) {
  return <ErroAoCarregar titulo="Não foi possível carregar este filme agora." retry={retry} />;
}
