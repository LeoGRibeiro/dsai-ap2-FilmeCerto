import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { idAutorizacaoValido } from "@/features/oauth/id";
import { Consentimento } from "@/features/oauth/components/consentimento";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Autorizar agente" };

function Erro({ texto }: { texto: string }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4 py-16">
      <h1 className="text-3xl tracking-tight">Não deu para autorizar</h1>
      <p className="text-muted-foreground">{texto}</p>
    </main>
  );
}

export default async function ConsentPage({ searchParams }: PageProps<"/oauth/consent">) {
  const { authorization_id: id, erro } = await searchParams;
  if (!idAutorizacaoValido(id)) {
    return <Erro texto="Pedido de autorização inválido. Volte ao seu agente e conecte de novo." />;
  }
  if (erro) return <Erro texto="Não foi possível concluir a autorização. Tente conectar de novo." />;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(id);
  if (error || !data) {
    return <Erro texto="Pedido de autorização inválido ou expirado. Conecte o agente de novo." />;
  }
  if (!("authorization_id" in data)) {
    if (typeof data.redirect_url !== "string" || !data.redirect_url) {
      return <Erro texto="Pedido de autorização inválido ou expirado. Conecte o agente de novo." />;
    }
    redirect(data.redirect_url);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-16">
      <Consentimento
        authorizationId={data.authorization_id}
        cliente={data.client.name || "Um agente"}
        redirectUri={data.redirect_uri}
        escopos={data.scope.split(" ").filter(Boolean)}
        email={data.user.email}
      />
    </main>
  );
}
