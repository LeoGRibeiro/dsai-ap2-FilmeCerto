import { cn } from "cn";
import Link from "next/link";

import type { Metricas } from "@/features/metricas/consultas";
import type { NomeEvento } from "@/features/metricas/eventos";
import { calcularFunil, distribuir, larguraBarra, type Recorte } from "@/features/metricas/funil";
import {
  ROTULOS_COMO_FOI,
  ROTULOS_ETAPA,
  ROTULOS_EVENTO,
  ROTULOS_MOTIVO,
  ROTULOS_ORIGEM,
  ROTULOS_TROCAS,
} from "@/features/metricas/rotulos";

const RECORTES: { recorte: Recorte; rotulo: string; href: string }[] = [
  { recorte: "todos", rotulo: "Todos", href: "/metricas" },
  { recorte: "sem-equipe", rotulo: "Sem a equipe", href: "/metricas?recorte=sem-equipe" },
];

/** Os funis e os detalhes da tabela "Visões" de SPEC/2026-11-18-metricas-funil.md. */
const FUNIS: { titulo: string; legenda?: string; etapas: NomeEvento[] }[] = [
  {
    titulo: "Funil do wizard",
    etapas: ["wizard_iniciado", "wizard_concluido", "wizard_escolheu"],
  },
  {
    titulo: "Funil do “Como foi?”",
    legenda: "A mesma escolha pode ser perguntada em até 2 visitas.",
    etapas: ["como_foi_exibido", "como_foi_respondido"],
  },
];

const DETALHES: {
  titulo: string;
  nome: NomeEvento;
  chave: string;
  rotulos: Record<string, string>;
}[] = [
  { titulo: "Trocas por motivo", nome: "wizard_troca", chave: "motivo", rotulos: ROTULOS_MOTIVO },
  {
    titulo: "Trocas até escolher",
    nome: "wizard_escolheu",
    chave: "trocas",
    rotulos: ROTULOS_TROCAS,
  },
  {
    titulo: "Saídas sem escolher",
    nome: "wizard_abandonado",
    chave: "etapa",
    rotulos: ROTULOS_ETAPA,
  },
  {
    titulo: "Respostas do “Como foi?”",
    nome: "como_foi_respondido",
    chave: "resposta",
    rotulos: ROTULOS_COMO_FOI,
  },
  {
    titulo: "Trailers por origem",
    nome: "trailer_aberto",
    chave: "origem",
    rotulos: ROTULOS_ORIGEM,
  },
];

/** Uma linha: rótulo, número e porcentagens em texto; a barra só repete o que o texto diz. */
function Linha({
  rotulo,
  total,
  porcentagens,
  largura,
}: {
  rotulo: string;
  total: number;
  porcentagens: string;
  largura: number;
}) {
  return (
    <li className="flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span>{rotulo}</span>
        <span className="tabular-nums">
          <strong className="font-semibold">{total}</strong>
          {porcentagens && <span className="text-muted-foreground"> · {porcentagens}</span>}
        </span>
      </div>
      <div aria-hidden="true" className="bg-muted h-2 overflow-hidden rounded-full">
        <div className="bg-primary h-full rounded-full" style={{ width: `${largura}%` }} />
      </div>
    </li>
  );
}

function Bloco({
  id,
  titulo,
  legenda,
  children,
}: {
  id: string;
  titulo: string;
  legenda?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 id={id} className="font-medium">
        {titulo}
      </h3>
      {legenda && <p className="text-muted-foreground -mt-2 text-xs">{legenda}</p>}
      <ol aria-labelledby={id} className="flex flex-col gap-3">
        {children}
      </ol>
    </div>
  );
}

function SeletorRecorte({ ativo }: { ativo: Recorte }) {
  return (
    <nav aria-label="Contas contadas" className="border-border flex w-fit rounded-md border p-1">
      {RECORTES.map(({ recorte, rotulo, href }) => (
        <Link
          key={recorte}
          href={href}
          aria-current={recorte === ativo ? "page" : undefined}
          className={cn(
            "rounded px-3 py-1.5 text-sm font-medium transition-colors",
            recorte === ativo
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {rotulo}
        </Link>
      ))}
    </nav>
  );
}

/** Funis do wizard e do "Como foi?" e os detalhes dos eventos, no recorte escolhido. */
export function FunilMetricas({ metricas, recorte }: { metricas: Metricas; recorte: Recorte }) {
  return (
    <section aria-labelledby="titulo-funil" className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 id="titulo-funil" className="text-2xl tracking-tight">
          Funil e detalhes
        </h2>
        <p className="text-muted-foreground text-sm">
          Ocorrências de cada evento. Em “Sem a equipe”, só as contas de fora da equipe.
        </p>
        <SeletorRecorte ativo={recorte} />
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        {FUNIS.map(({ titulo, legenda, etapas }, f) => (
          <Bloco key={titulo} id={`funil-${f}`} titulo={titulo} legenda={legenda}>
            {calcularFunil(metricas.eventos, etapas, recorte).map((etapa, i) => (
              <Linha
                key={etapa.nome}
                rotulo={ROTULOS_EVENTO[etapa.nome]}
                total={etapa.total}
                porcentagens={[
                  i > 0 && etapa.doInicio !== null && `${etapa.doInicio}% do início`,
                  i > 1 && etapa.daAnterior !== null && `${etapa.daAnterior}% da etapa anterior`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                largura={larguraBarra(etapa.doInicio)}
              />
            ))}
          </Bloco>
        ))}
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        {DETALHES.map(({ titulo, nome, chave, rotulos }, d) => (
          <Bloco key={titulo} id={`detalhe-${d}`} titulo={titulo}>
            {distribuir(metricas.detalhes, nome, chave, Object.keys(rotulos), recorte).map(
              (fatia) => (
                <Linha
                  key={fatia.valor}
                  rotulo={rotulos[fatia.valor]}
                  total={fatia.total}
                  porcentagens={fatia.parcela === null ? "" : `${fatia.parcela}%`}
                  largura={larguraBarra(fatia.parcela)}
                />
              ),
            )}
          </Bloco>
        ))}
      </div>
    </section>
  );
}
