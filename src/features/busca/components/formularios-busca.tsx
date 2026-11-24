import { cn } from "cn";
import Form from "next/form";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ORDENS, type FiltrosBusca, type Modo } from "@/features/busca/parametros";
import { GENEROS } from "@/features/preferencias/generos";
import { ROTULOS_DURACAO, type Duracao } from "@/features/preferencias/opcoes";
import type { TipoMidia } from "@/lib/midia";
import type { OrdemDescoberta } from "@/lib/tmdb/tipos";

const ROTULOS_ORDEM: Record<OrdemDescoberta, string> = {
  popularidade: "Mais populares",
  nota: "Mais bem avaliados",
  lancamento: "Lançamentos",
};

const DURACOES_FILTRO: Duracao[] = ["indiferente", "curta", "media", "longa"];

const estiloSelect =
  "border-input bg-background dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3";

type Aba<T> = { valor: T; rotulo: string; href: string };

function Abas<T extends string>({
  rotulo,
  ativa,
  abas,
}: {
  rotulo: string;
  ativa: T;
  abas: Aba<T>[];
}) {
  return (
    <nav aria-label={rotulo} className="border-border flex gap-1 border-b">
      {abas.map(({ valor, rotulo, href }) => (
        <Link
          key={valor}
          href={href}
          aria-current={valor === ativa ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            valor === ativa
              ? "border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground border-transparent",
          )}
        >
          {rotulo}
        </Link>
      ))}
    </nav>
  );
}

export function AbasBusca({ ativa }: { ativa: Modo }) {
  return (
    <Abas
      rotulo="Modo de busca"
      ativa={ativa}
      abas={[
        { valor: "nome", rotulo: "Por nome", href: "/busca" },
        { valor: "filtros", rotulo: "Por filtros", href: "/busca?modo=filtros" },
      ]}
    />
  );
}

/** "Filmes | Séries" da busca por nome; os links mantêm o texto buscado. */
export function AbasTipo({ ativa, texto }: { ativa: TipoMidia; texto: string }) {
  const href = (tipo: TipoMidia) => {
    const parametros = new URLSearchParams({
      ...(texto && { q: texto }),
      ...(tipo === "serie" && { tipo }),
    }).toString();
    return parametros ? `/busca?${parametros}` : "/busca";
  };
  return (
    <Abas
      rotulo="Tipo de título"
      ativa={ativa}
      abas={[
        { valor: "filme", rotulo: "Filmes", href: href("filme") },
        { valor: "serie", rotulo: "Séries", href: href("serie") },
      ]}
    />
  );
}

export function FormularioNome({ texto, tipo = "filme" }: { texto: string; tipo?: TipoMidia }) {
  return (
    // A chave remonta os campos quando a busca muda pelo header: com a navegação pelo
    // cliente, o `defaultValue` sozinho manteria o texto da busca anterior.
    <Form
      key={`${tipo}:${texto}`}
      action="/busca"
      role="search"
      className="flex flex-wrap items-end gap-3"
    >
      {tipo === "serie" && <input type="hidden" name="tipo" value="serie" />}
      <div className="flex min-w-48 flex-1 flex-col gap-2">
        <Label htmlFor="busca-q">{tipo === "serie" ? "Nome da série" : "Nome do filme"}</Label>
        <Input id="busca-q" name="q" type="search" defaultValue={texto} className="h-10" />
      </div>
      <Button type="submit" size="lg" className="h-10 px-5">
        Buscar
      </Button>
    </Form>
  );
}

export function FormularioFiltros({ filtros }: { filtros: FiltrosBusca }) {
  return (
    <Form
      key={JSON.stringify(filtros)}
      action="/busca"
      className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-1"
    >
      <input type="hidden" name="modo" value="filtros" />
      <div className="flex flex-col gap-2">
        <Label htmlFor="filtro-genero">Gênero</Label>
        <select
          id="filtro-genero"
          name="genero"
          defaultValue={filtros.genero ?? ""}
          className={estiloSelect}
        >
          <option value="">Todos</option>
          {GENEROS.map(({ id, nome }) => (
            <option key={id} value={id}>
              {nome}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="filtro-ano">Ano de lançamento</Label>
        <Input
          id="filtro-ano"
          name="ano"
          type="number"
          inputMode="numeric"
          min={1888}
          placeholder="Qualquer"
          defaultValue={filtros.ano ?? ""}
          className="h-10"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="filtro-duracao">Duração</Label>
        <select
          id="filtro-duracao"
          name="duracao"
          defaultValue={filtros.duracao}
          className={estiloSelect}
        >
          {DURACOES_FILTRO.map((duracao) => (
            <option key={duracao} value={duracao}>
              {ROTULOS_DURACAO[duracao]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="filtro-ordem">Ordenar por</Label>
        <select
          id="filtro-ordem"
          name="ordem"
          defaultValue={filtros.ordem}
          className={estiloSelect}
        >
          {ORDENS.map((ordem) => (
            <option key={ordem} value={ordem}>
              {ROTULOS_ORDEM[ordem]}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="lg" className="h-10 px-5">
        Aplicar filtros
      </Button>
    </Form>
  );
}
