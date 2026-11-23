import { expect, test } from "@playwright/test";

import { emailAleatorio } from "../support/supabase-local";
import { cadastrar, concluirOnboarding } from "./helpers";

// TEMPORÁRIO (PR #43): mostra o que a tela exibe depois do redirect do onboarding.
test("diagnóstico: o que aparece depois do onboarding", async ({ page }) => {
  const eventos: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning")
      eventos.push(`console ${m.type()}: ${m.text().slice(0, 300)}`);
  });
  page.on("pageerror", (e) => eventos.push(`pageerror: ${e.message.slice(0, 300)}`));
  page.on("requestfailed", (r) =>
    eventos.push(`falhou: ${r.method()} ${r.url().slice(0, 120)} ${r.failure()?.errorText}`),
  );
  page.on("response", (r) => {
    const u = r.url();
    if (r.status() >= 300 || u.includes("_rsc") || r.request().method() === "POST")
      eventos.push(
        `resp ${r.status()} ${r.request().method()} ${u.replace(/^https?:\/\/[^/]+/, "").slice(0, 100)}`,
      );
  });

  await cadastrar(page, "Diego Teste", emailAleatorio("e2e"));
  await concluirOnboarding(page);
  const t0 = Date.now();
  const telas: string[] = [];
  for (let i = 0; i < 12; i++) {
    const texto = (
      await page
        .locator("main")
        .innerText()
        .catch(() => "?")
    )
      .replace(/\s+/g, " ")
      .slice(0, 140);
    telas.push(`${Date.now() - t0}ms ${new URL(page.url()).pathname} | ${texto}`);
    await page.waitForTimeout(1000);
  }
  expect(
    [...new Set(telas.map((t) => t.split(" ").slice(1).join(" ")))].join("\n") +
      "\n---\n" +
      eventos.join("\n"),
  ).toBe("");
});
