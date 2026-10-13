"use server";

import { redirect } from "next/navigation";

import { idAutorizacaoValido } from "@/features/oauth/id";
import { createClient } from "@/lib/supabase/server";

/** Aprova ou nega o pedido de acesso de um agente e devolve a pessoa ao cliente OAuth. */
export async function decidirAutorizacao(formData: FormData) {
  const id = formData.get("authorization_id");
  const decisao = formData.get("decisao");
  if (!idAutorizacaoValido(id)) redirect("/oauth/consent");

  const supabase = await createClient();
  const opcoes = { skipBrowserRedirect: true };
  const { data, error } =
    decisao === "aprovar"
      ? await supabase.auth.oauth.approveAuthorization(id, opcoes)
      : await supabase.auth.oauth.denyAuthorization(id, opcoes);

  if (error || !data || typeof data.redirect_url !== "string" || !data.redirect_url) {
    console.error("[oauth] falha na decisão:", error?.message);
    redirect(`/oauth/consent?authorization_id=${encodeURIComponent(id)}&erro=1`);
  }
  redirect(data.redirect_url);
}
