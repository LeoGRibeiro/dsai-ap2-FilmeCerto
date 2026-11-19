import { cn } from "cn";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { CLIMAS } from "@/features/metricas/eventos";
import { ROTULOS_CLIMA } from "@/features/metricas/rotulos";
import { BotaoVoltar } from "@/features/noite/components/botao-voltar";
import { inicioDaNoite, urlComResposta, type EstadoNoite } from "@/features/noite/estado";
import { PERGUNTAS, ROTULOS_TIPO } from "@/features/noite/opcoes";
import { TIPOS_MIDIA } from "@/lib/midia";

export type PerguntaDaNoite = (typeof PERGUNTAS)[number];

/**
 * "Filme ou série?" na 1ª tela, com o tipo atual marcado. Quem vem do dashboard já escolheu
 * no botão; aqui dá para mudar de ideia (SPEC/2026-11-18-series-noite.md).
 */
function FilmeOuSerie({ estado }: { estado: EstadoNoite }) {
  return (
    <div
      role="group"
      aria-labelledby="filme-ou-serie"
      className="flex flex-wrap items-center gap-2"
    >
      <p id="filme-ou-serie" className="text-muted-foreground mr-1 text-sm">
        Filme ou série?
      </p>
      {TIPOS_MIDIA.map((tipo) => {
        const atual = tipo === estado.tipo;
        return (
          <Link
            key={tipo}
            href={inicioDaNoite(tipo)}
            aria-current={atual ? "true" : undefined}
            className={cn(
              buttonVariants({ variant: atual ? "default" : "outline" }),
              "h-10 px-4 text-sm",
            )}
          >
            {ROTULOS_TIPO[tipo]}
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Uma tela do wizard: a pergunta e um cartão grande por resposta. Cada cartão é um link
 * para a URL com a resposta, então responder é um clique e "Voltar" é o histórico.
 */
export function PerguntaNoite({
  estado,
  pergunta,
  rota,
}: {
  estado: EstadoNoite;
  pergunta: PerguntaDaNoite;
  /** Outra rota com as mesmas perguntas (a sala da "Noite a dois"); o padrão é `/noite`. */
  rota?: string;
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
      {posicao === 1 && <FilmeOuSerie estado={estado} />}
      <h1 id="pergunta-noite" className="text-3xl tracking-tight text-balance sm:text-4xl">
        {pergunta.titulo}
      </h1>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {respostas.map((valor) => (
          <li key={valor}>
            <Link
              href={urlComResposta(estado, pergunta.chave, valor, rota)}
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
