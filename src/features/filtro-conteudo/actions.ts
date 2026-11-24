"use server";

import { revalidatePath } from "next/cache";

import { escolhaFiltroSchema, gravarFiltro } from "@/features/filtro-conteudo/gravar";
import { createClient } from "@/lib/supabase/server";

export type EstadoFiltro = { ok?: boolean; mensagem?: string };

/** "Salvar filtro" no /perfil. Só a opção é gravada, nunca a idade. */
export async function salvarFiltro(
  _anterior: EstadoFiltro,
  formData: FormData,
): Promise<EstadoFiltro> {
  const escolha = escolhaFiltroSchema.safeParse(formData.get("filtro"));
  if (!escolha.success) return { mensagem: escolha.error.issues[0]?.message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { mensagem: "Sua sessão expirou. Entre de novo." };

  if ((await gravarFiltro(supabase, user.id, escolha.data)) === "erro") {
    return { mensagem: "Não foi possível salvar agora. Tente de novo." };
  }
  // O filtro muda o dashboard, a busca, as listas e as páginas de filme e série.
  revalidatePath("/", "layout");
  return { ok: true };
}
