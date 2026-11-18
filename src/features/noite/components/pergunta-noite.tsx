import Link from "next/link";

import { CLIMAS } from "@/features/metricas/eventos";
import { ROTULOS_CLIMA } from "@/features/metricas/rotulos";
import { BotaoVoltar } from "@/features/noite/components/botao-voltar";
import { urlComResposta, type EstadoNoite } from "@/features/noite/estado";
import { PERGUNTAS } from "@/features/noite/opcoes";

export type PerguntaDaNoite = (typeof PERGUNTAS)[number];

/**
 * Uma tela do wizard: a pergunta e um cartão grande por resposta. Cada cartão é um link
 * para a URL com a resposta, então responder é um clique e "Voltar" é o histórico.
 */
export function PerguntaNoite({
  estado,
  pergunta,
}: {
  estado: EstadoNoite;
  pergunta: PerguntaDaNoite;
}) {
  const posicao = PERGUNTAS.indexOf(pergunta) + 1;
  const respostas = CLIMAS[pergunta.chave];

  return (
    <section aria-labelledby="pergunta-noite" className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <BotaoVoltar />
        <p className="text-muted-foreground text-sm">
          {posicao} de {PERGUNTAS.length}
        </p>
      </div>
      <h1 id="pergunta-noite" className="text-3xl tracking-tight text-balance sm:text-4xl">
        {pergunta.titulo}
      </h1>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {respostas.map((valor) => (
          <li key={valor}>
            <Link
              href={urlComResposta(estado, pergunta.chave, valor)}
              className="border-border bg-card hover:bg-muted focus-visible:ring-ring/50 flex min-h-24 items-center justify-center rounded-xl border p-4 text-center text-lg font-medium text-balance transition-colors outline-none focus-visible:ring-3 active:translate-y-px"
            >
              {ROTULOS_CLIMA[valor]}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
