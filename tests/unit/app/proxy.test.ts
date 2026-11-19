import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { updateSession } from "@/lib/supabase/middleware";
import { proxy } from "@/proxy";

vi.mock("@/lib/supabase/middleware", () => ({ updateSession: vi.fn() }));

function sessao(usuario: { id: string } | null) {
  vi.mocked(updateSession).mockResolvedValue({
    response: NextResponse.next(),
    user: usuario,
  } as never);
}

describe("proxy", () => {
  it.each(["/serie/1399", "/filme/550"])(
    "sem sessão, %s leva ao login com o destino",
    async (rota) => {
      sessao(null);

      const resposta = await proxy(new NextRequest(`http://localhost${rota}`));

      expect(resposta.status).toBe(307);
      expect(resposta.headers.get("location")).toBe(
        `http://localhost/login?next=${encodeURIComponent(rota)}`,
      );
    },
  );

  it("com sessão, a página da série segue", async () => {
    sessao({ id: "u-1" });

    const resposta = await proxy(new NextRequest("http://localhost/serie/1399"));

    expect(resposta.headers.get("location")).toBeNull();
  });
});
