import "server-only";

import { semBloqueados } from "@/features/filtro-conteudo/aplicar";
import { classificarMidia } from "@/features/filtro-conteudo/classificar";
import type { FiltroConteudo } from "@/features/filtro-conteudo/opcoes";
import { diaEmSaoPaulo } from "@/features/recomendacao/semente";
import type { AvisoEpisodio } from "@/features/serie/avisos";
import { CartaoAvisos } from "@/features/serie/components/cartao-avisos";
import { obterAvisosNaoLidos } from "@/features/serie/consultas";
import { gerarAvisos } from "@/features/serie/gravar";
import { createClient } from "@/lib/supabase/server";

/** Avisos no cartão, no máximo. */
export const AVISOS_NO_CARTAO = 3;

type Props = { usuarioId: string; filtro: FiltroConteudo; agora?: Date };

/** Gera os avisos e lê os não lidos que já estrearam, sem os de série bloqueada pelo filtro. */
async function carregar({ usuarioId, filtro, agora = new Date() }: Props) {
  try {
    const supabase = await createClient();
    await gerarAvisos(supabase, usuarioId);
    const avisos = await obterAvisosNaoLidos(supabase, usuarioId, diaEmSaoPaulo(agora));
    const visiveis = await semBloqueados(
      avisos,
      filtro,
      (aviso: AvisoEpisodio) => ({ tipo: "serie", tmdbId: aviso.serieTmdbId }),
      classificarMidia,
    );
    return visiveis.slice(0, AVISOS_NO_CARTAO);
  } catch (erro) {
    console.error("[serie] falha ao carregar avisos:", erro);
    return [];
  }
}

/**
 * Avisos de episódio novo no início, no próprio `Suspense`: o TMDB das séries acompanhadas não
 * atrasa o resto da página. Sem aviso (ou com erro), não aparece.
 */
export async function AvisosEpisodios(props: Props) {
  const avisos = await carregar(props);
  if (avisos.length === 0) return null;
  return <CartaoAvisos avisos={avisos} />;
}
