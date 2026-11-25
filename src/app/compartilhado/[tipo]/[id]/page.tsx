import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { obterUsuarioAtual } from "@/features/auth/sessao";
import { PaginaCompartilhada } from "@/features/compartilhado/components/pagina-compartilhada";
import { metadadosCompartilhado } from "@/features/compartilhado/metadados";
import { buscarCompartilhado, lerCompartilhado } from "@/features/compartilhado/titulo";
import { caminhoMidia } from "@/lib/midia";

type Props = PageProps<"/compartilhado/[tipo]/[id]">;

/** Título, descrição e pôster para a prévia do link no WhatsApp. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tipo, id } = await params;
  return metadadosCompartilhado(await buscarCompartilhado(tipo, id));
}

/**
 * Página pública do título compartilhado (SPEC/2026-11-25-compartilhar-publico.md). Fica fora de
 * `(app)` e das rotas protegidas do proxy; não lê o banco. Quem já está logado vai direto à página
 * normal do título, com o filtro de conteúdo da própria conta.
 */
export default async function CompartilhadoPage({ params }: Props) {
  const { tipo, id } = await params;
  const midia = lerCompartilhado(tipo, id);
  if (!midia) notFound();
  if (await obterUsuarioAtual()) redirect(caminhoMidia(midia));

  const compartilhado = await buscarCompartilhado(tipo, id);
  if (!compartilhado) notFound();
  return <PaginaCompartilhada compartilhado={compartilhado} />;
}
