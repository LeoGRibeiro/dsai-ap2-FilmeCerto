import type { Metricas } from "@/features/metricas/consultas";
import { CLIMAS, type NomeEvento, type Pergunta } from "@/features/metricas/eventos";
import { ROTULOS_CLIMA, ROTULOS_EVENTO, ROTULOS_PERGUNTA } from "@/features/metricas/rotulos";

const celula = "border-border border-b px-3 py-2";
const numero = `${celula} text-right tabular-nums`;

/** Todos os eventos da lista, na ordem dos rótulos, com zero para os que ainda não ocorreram. */
function TabelaEventos({ eventos }: { eventos: Metricas["eventos"] }) {
  const porNome = new Map(eventos.map((evento) => [evento.nome, evento]));
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Eventos de uso</caption>
      <thead className="text-muted-foreground text-left">
        <tr>
          <th className={celula}>Evento</th>
          <th className={`${celula} text-right`}>Total</th>
          <th className={`${celula} text-right`}>Pessoas</th>
          <th className={`${celula} text-right`}>Sem a equipe</th>
        </tr>
      </thead>
      <tbody>
        {(Object.keys(ROTULOS_EVENTO) as NomeEvento[]).map((nome) => {
          const linha = porNome.get(nome);
          return (
            <tr key={nome}>
              <th scope="row" className={`${celula} text-left font-normal`}>
                {ROTULOS_EVENTO[nome]} <code className="text-muted-foreground text-xs">{nome}</code>
              </th>
              <td className={numero}>{linha?.total ?? 0}</td>
              <td className={numero}>{linha?.pessoas ?? 0}</td>
              <td className={numero}>{linha?.semEquipe ?? 0}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Uma tabela por pergunta do wizard, da resposta mais escolhida para a menos. */
function TabelaClima({ pergunta, climas }: { pergunta: Pergunta; climas: Metricas["climas"] }) {
  const total = (resposta: string) =>
    climas.find((clima) => clima.pergunta === pergunta && clima.resposta === resposta)?.total ?? 0;
  const respostas = [...CLIMAS[pergunta]].sort((a, b) => total(b) - total(a));
  return (
    <table className="w-full text-sm">
      <caption className="mb-2 text-left font-medium">{ROTULOS_PERGUNTA[pergunta]}</caption>
      <tbody>
        {respostas.map((resposta) => (
          <tr key={resposta}>
            <th scope="row" className={`${celula} text-left font-normal`}>
              {ROTULOS_CLIMA[resposta]}
            </th>
            <td className={numero}>{total(resposta)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TabelaMetricas({ metricas }: { metricas: Metricas }) {
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="titulo-eventos" className="flex flex-col gap-3">
        <h2 id="titulo-eventos" className="text-2xl tracking-tight">
          Eventos
        </h2>
        <TabelaEventos eventos={metricas.eventos} />
      </section>
      <section aria-labelledby="titulo-climas" className="flex flex-col gap-3">
        <h2 id="titulo-climas" className="text-2xl tracking-tight">
          Climas do wizard
        </h2>
        <p className="text-muted-foreground text-sm">
          Contados sem vínculo com a pessoa, por isso não há separação da equipe.
        </p>
        <div className="grid gap-6 sm:grid-cols-3">
          {(Object.keys(CLIMAS) as Pergunta[]).map((pergunta) => (
            <TabelaClima key={pergunta} pergunta={pergunta} climas={metricas.climas} />
          ))}
        </div>
      </section>
    </div>
  );
}
