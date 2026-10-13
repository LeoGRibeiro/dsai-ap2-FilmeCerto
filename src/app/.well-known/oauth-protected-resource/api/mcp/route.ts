import { metadataCorsOptionsRequestHandler, protectedResourceHandler } from "mcp-handler";

import { getPublicEnv } from "@/lib/env";

/** RFC 9728: diz ao cliente MCP que quem emite os tokens é o Auth do Supabase. */
export function GET(req: Request) {
  const issuer = `${getPublicEnv().NEXT_PUBLIC_SUPABASE_URL}/auth/v1`;
  return protectedResourceHandler({ authServerUrls: [issuer] })(req);
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
