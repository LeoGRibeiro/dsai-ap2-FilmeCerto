import type { Metadata } from "next";

import { exigirUsuario } from "@/features/auth/sessao";
import { EnviarRespostas } from "@/features/noite/components/enviar-respostas";
import { EsperandoSala } from "@/features/noite/components/esperando-sala";
import { LinkSala } from "@/features/noite/components/link-sala";
import { MontarSala } from "@/features/noite/components/montar-sala";
import { PerguntaNoite } from "@/features/noite/components/pergunta-noite";
import { paraTela } from "@/features/noite/components/recomendacao-noite";
import { ResultadoSala } from "@/features/noite/components/resultado-sala";
import { SalaIndisponivel } from "@/features/noite/components/sala-indisponivel";
import {
  ESTADO_INICIAL,
  lerEstado,
  proximaPergunta,
  respostasCompletas,
  rotaDaSala,
} from "@/features/noite/estado";
import { provedorDaNoite } from "@/features/noite/motivo";
import { abrirSala, type ResultadoSala as Resultado } from "@/features/noite/sala";
import { obterPreferencias } from "@/features/preferencias/consultas";
import { createClient } from "@/lib/supabase/server";
import { obterFilme } from "@/lib/tmdb/filmes";

export const metadata: Metadata = { title: "Noite a dois" };

/** Os filmes da sugestão, com os detalhes do TMDB (cache de 24 h) e o streaming de quem vê. */
async function filmesDaSala({ filmes }: Resultado) {
  const streamings = (await obterPreferencias())?.streamings ?? [];
  const detalhes = await Promise.all(filmes.map(({ id }) => obterFilme(id)));
  return filmes.flatMap(({ motivo }, i) => {
    const filme = detalhes[i];
    if (!filme) return [];
    const provedor = provedorDaNoite(filme.ondeAssistir, streamings);
    return [paraTela({ filme, provedor, motivo })];
  });
}

/**
 * Sala da "Noite a dois" (SPEC/2026-11-18-noite-a-dois.md). Abrir o link entra na sala;
 * cada pessoa responde as perguntas do wizard, espera a outra e as duas veem a mesma sugestão.
 */
export default async function SalaPage({
  params,
  searchParams,
}: PageProps<"/noite/juntos/[sala]">) {
  await exigirUsuario();
  const { sala } = await params;
  const tela = await abrirSala(await createClient(), sala);

  let conteudo;
  if (tela.tipo === "indisponivel") {
    conteudo = <SalaIndisponivel motivo={tela.motivo} />;
  } else if (tela.tipo === "resultado") {
    conteudo = <ResultadoSala filmes={await filmesDaSala(tela.resultado)} />;
  } else if (tela.tipo === "montar") {
    conteudo = <MontarSala sala={sala} />;
  } else {
    // Só as respostas da URL valem aqui; o resto do estado do wizard não se aplica à sala.
    const estado = { ...ESTADO_INICIAL, respostas: lerEstado(await searchParams).respostas };
    const pergunta = proximaPergunta(estado);
    const respostas = respostasCompletas(estado);
    const chamar = tela.papel === "criador" && !tela.convidadoEntrou;
    conteudo = (
      <>
        {tela.tipo === "esperando" && <EsperandoSala />}
        {tela.tipo === "perguntas" && pergunta && (
          <PerguntaNoite estado={estado} pergunta={pergunta} rota={rotaDaSala(sala)} />
        )}
        {tela.tipo === "perguntas" && respostas && (
          <EnviarRespostas sala={sala} respostas={respostas} />
        )}
        {chamar && <LinkSala sala={sala} />}
      </>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <p className="text-primary text-sm font-medium tracking-wide uppercase">Noite a dois</p>
      {conteudo}
    </div>
  );
}
