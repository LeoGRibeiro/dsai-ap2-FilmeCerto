// @vitest-environment node
import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { updateSession } from "@/lib/supabase/middleware";
import { proxy } from "@/proxy";

vi.mock("@/lib/supabase/middleware", () => ({ updateSession: vi.fn() }));

function sessao(user: { id: string } | null) {
  vi.mocked(updateSession).mockResolvedValue({ response: NextResponse.next(), user } as never);
}

describe("proxy", () => {
  it("sem sessão, manda /noite para o login guardando as respostas em next", async () => {
    sessao(null);

    const resposta = await proxy(new NextRequest("http://localhost/noite?humor=cansado"));

    const destino = new URL(resposta.headers.get("location")!);
    expect(destino.pathname).toBe("/login");
    expect(destino.searchParams.get("next")).toBe("/noite?humor=cansado");
  });

  it("com sessão, deixa /noite passar", async () => {
    sessao({ id: "u-1" });

    const resposta = await proxy(new NextRequest("http://localhost/noite"));

    expect(resposta.headers.get("location")).toBeNull();
  });
});
