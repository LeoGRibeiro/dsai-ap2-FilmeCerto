import { ShieldAlert } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { eAdulto, sinopseCurta, TITULO_ADULTO } from "@/features/compartilhado/metadados";
import type { Compartilhado } from "@/features/compartilhado/titulo";
import { Cabecalho, CabecalhoFilme } from "@/features/filme/components/cabecalho-filme";
import { OndeAssistir } from "@/features/filme/components/onde-assistir";
import { Secao, Sinopse } from "@/features/filme/components/pagina-titulo";
import { dadosDaSerie } from "@/features/serie/formatar";
import { caminhoMidia, type Midia } from "@/lib/midia";

const ESTILO = "h-11 px-5 text-base";

/** "Criar conta" e "Entrar"; o "Entrar" volta à página do título na área logada. */
export function ConviteConta({ midia, texto }: { midia: Midia; texto: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">{texto}</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/cadastro" className={buttonVariants({ size: "lg", className: ESTILO })}>
          Criar conta
        </Link>
        <Link
          href={`/login?next=${caminhoMidia(midia)}`}
          className={buttonVariants({ variant: "outline", size: "lg", className: ESTILO })}
        >
          Entrar
        </Link>
      </div>
    </div>
  );
}

/**
 * Página pública do título compartilhado (SPEC/2026-11-25-compartilhar-publico.md): o cabeçalho
 * das páginas logadas, sinopse curta, onde assistir e o convite, sem nada da conta de ninguém.
 * Um +18 não mostra nada do título: sem usuário, não há filtro de conteúdo.
 */
export function PaginaCompartilhada({ compartilhado }: { compartilhado: Compartilhado }) {
  const { tipo, titulo } = compartilhado;
  const midia: Midia = { tipo, tmdbId: titulo.id };

  if (eAdulto(compartilhado)) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8">
        <section
          data-testid="titulo-adulto"
          className="border-border bg-card mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border p-8 text-center"
        >
          <ShieldAlert className="text-muted-foreground size-10" aria-hidden="true" />
          <h1 className="text-3xl tracking-tight">{TITULO_ADULTO}</h1>
          <ConviteConta
            midia={midia}
            texto="Entre na sua conta para ver os detalhes, com o filtro de conteúdo dela."
          />
        </section>
      </div>
    );
  }

  const convite = (
    <ConviteConta
      midia={midia}
      texto="No Filme Certo, você descobre o que ver hoje em poucos cliques."
    />
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-8">
      {compartilhado.tipo === "filme" ? (
        <CabecalhoFilme filme={compartilhado.titulo} acoes={convite} />
      ) : (
        <Cabecalho
          titulo={compartilhado.titulo}
          dados={dadosDaSerie(compartilhado.titulo)}
          classificacao={compartilhado.titulo.classificacao}
          acoes={convite}
        />
      )}

      <Sinopse
        texto={sinopseCurta(titulo.sinopse)}
        rotulo={compartilhado.tipo === "filme" ? "Direção" : "Criação"}
        nomes={
          compartilhado.tipo === "filme"
            ? compartilhado.titulo.direcao
            : compartilhado.titulo.criacao
        }
      />

      <Secao titulo="Onde assistir no Brasil">
        <OndeAssistir dados={titulo.ondeAssistir} tipo={tipo} />
      </Secao>
    </div>
  );
}
