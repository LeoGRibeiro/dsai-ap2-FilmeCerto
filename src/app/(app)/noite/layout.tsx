import { SessaoNoite } from "@/features/noite/components/sessao-noite";

/** Mantém a sessão do wizard (eventos de início, conclusão e abandono) entre as telas. */
export default function NoiteLayout({ children }: LayoutProps<"/noite">) {
  return <SessaoNoite>{children}</SessaoNoite>;
}
