import { redirect } from "next/navigation";

import { exigirUsuario } from "@/features/auth/sessao";
import { obterPreferencias } from "@/features/preferencias/consultas";

/**
 * Área logada. O proxy já redireciona quem não tem sessão; esta é a checagem
 * definitiva, e também manda para o onboarding quem ainda não o concluiu.
 * Usuário e preferências são lidos ao mesmo tempo: a RLS filtra as preferências
 * pelo JWT, então a consulta não espera o id (SPEC/2026-11-23-navegacao-rapida.md).
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [, preferencias] = await Promise.all([exigirUsuario(), obterPreferencias()]);
  if (!preferencias) redirect("/onboarding");
  return <>{children}</>;
}
