import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("devolve o SHA do commit publicado na Vercel", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "abc1234");

    const resposta = GET();

    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ status: "ok", commit: "abc1234" });
  });

  it("devolve commit nulo fora da Vercel", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", undefined);

    expect(await GET().json()).toEqual({ status: "ok", commit: null });
  });
});
