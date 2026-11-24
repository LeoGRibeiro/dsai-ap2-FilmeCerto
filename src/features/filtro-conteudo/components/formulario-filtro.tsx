"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { MensagemErro } from "@/features/auth/components/mensagem-erro";
import { salvarFiltro } from "@/features/filtro-conteudo/actions";
import { OPCOES_FILTRO, SEM_FILTRO, type FiltroConteudo } from "@/features/filtro-conteudo/opcoes";
import { MensagemSucesso } from "@/features/perfil/components/mensagem-sucesso";

/** As quatro opções do filtro por idade, com a atual marcada. Funciona sem JavaScript. */
export function FormularioFiltro({ atual }: { atual: FiltroConteudo }) {
  const [estado, formAction, salvando] = useActionState(salvarFiltro, {});
  const marcada = atual ?? SEM_FILTRO;

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <MensagemErro mensagem={estado.mensagem} />
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">Filtro por idade</legend>
        {OPCOES_FILTRO.map((opcao) => (
          <label
            key={opcao.valor}
            className="border-border has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-ring/50 flex min-h-10 cursor-pointer items-start gap-3 rounded-xl border p-4 has-[:focus-visible]:ring-3"
          >
            <input
              type="radio"
              name="filtro"
              value={opcao.valor}
              defaultChecked={opcao.valor === marcada}
              className="accent-primary mt-1 size-4 shrink-0"
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{opcao.rotulo}</span>
              <span className="text-muted-foreground text-sm">{opcao.descricao}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <p className="text-muted-foreground text-xs">
        Títulos sem classificação indicativa abrem com um aviso, mas nunca são bloqueados. Quem usa
        esta conta pode mudar o filtro a qualquer momento.
      </p>
      <div className="flex items-center gap-4">
        <Button type="submit" size="lg" className="h-10 px-5" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar filtro"}
        </Button>
        {estado.ok && !salvando && <MensagemSucesso />}
      </div>
    </form>
  );
}
