import { expect, test } from "@playwright/test";

import { emailAleatorio } from "../support/supabase-local";
import { cadastrar } from "./helpers";

test("sem sessão, a tela de consentimento leva ao login e preserva o pedido", async ({ page }) => {
  await page.goto("/oauth/consent?authorization_id=abc");
  await expect(page).toHaveURL("/login?next=%2Foauth%2Fconsent%3Fauthorization_id%3Dabc");
});

test("com sessão e pedido inválido, mostra o erro", async ({ page }) => {
  await cadastrar(page, "Lia Prado", emailAleatorio("e2e"));
  await expect(page).toHaveURL("/onboarding");
  await page.goto("/oauth/consent?authorization_id=nao-existe");
  await expect(page.getByRole("heading", { name: "Não deu para autorizar" })).toBeVisible();
});
