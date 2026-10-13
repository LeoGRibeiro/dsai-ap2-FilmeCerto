import { Button } from "@/components/ui/button";
import { decidirAutorizacao } from "@/features/oauth/actions";

type Props = {
  authorizationId: string;
  cliente: string;
  redirectUri: string;
  escopos: string[];
  email: string;
};

function hostDe(uri: string) {
  try {
    return new URL(uri).host;
  } catch {
    return uri;
  }
}

/** Pedido de acesso de um agente (cliente OAuth) à conta do Filme Certo. */
export function Consentimento({ authorizationId, cliente, redirectUri, escopos, email }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl tracking-tight">{cliente} quer acessar sua conta</h1>
      <p className="text-muted-foreground text-sm">
        Conectado como {email}. Se autorizar, o agente poderá ver seus gostos, suas listas e
        suas avaliações, e também marcar filmes nas listas e avaliá-los por você.
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Volta para</dt>
        <dd>{hostDe(redirectUri)}</dd>
        {escopos.length > 0 && (
          <>
            <dt className="text-muted-foreground">Permissões</dt>
            <dd>{escopos.join(", ")}</dd>
          </>
        )}
      </dl>
      <p className="text-muted-foreground text-xs">
        Só autorize se foi você que acabou de conectar um agente. Dá para revogar depois no
        próprio agente.
      </p>
      <form action={decidirAutorizacao} className="flex gap-3">
        <input type="hidden" name="authorization_id" value={authorizationId} />
        <Button type="submit" name="decisao" value="aprovar">
          Autorizar
        </Button>
        <Button type="submit" name="decisao" value="negar" variant="outline">
          Negar
        </Button>
      </form>
    </div>
  );
}
