import { eventoSchema } from "@/features/metricas/eventos";
import { registrarEvento } from "@/features/metricas/registrar";
import { createClient } from "@/lib/supabase/server";

/** Corpo bem maior que qualquer evento válido: o resto é recusado sem ler JSON. */
const TAMANHO_MAXIMO = 2048;

const resposta = (status: number) => new Response(null, { status });

/**
 * Eventos de uso vindos do navegador (`enviarEvento`, com `sendBeacon`).
 * O corpo chega como `text/plain` com JSON; o usuário vem do cookie de sessão.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return resposta(401);

  const texto = await request.text();
  if (texto.length > TAMANHO_MAXIMO) return resposta(400);

  let corpo: unknown;
  try {
    corpo = JSON.parse(texto);
  } catch {
    return resposta(400);
  }
  const evento = eventoSchema.safeParse(corpo);
  if (!evento.success) return resposta(400);

  return resposta((await registrarEvento(supabase, evento.data)) ? 204 : 500);
}
