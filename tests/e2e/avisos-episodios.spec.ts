import { expect, test, type Page } from "@playwright/test";

import { emailAleatorio } from "../support/supabase-local";
import { cadastrar, concluirOnboarding } from "./helpers";

/**
 * Avisos de episódio novo (SPEC/2026-11-25-avisos-episodios.md). No TMDB falso, o último
 * episódio exibido de toda série é o 2x8, de hoje em São Paulo, e o próximo é de 2099.
 */
const ID = 1399;
const AVISO = `Saiu o episódio 8 da temporada 2 de Série ${ID}`;

const cartao = (page: Page) => page.getByRole("complementary", { name: "Episódios novos" });

function hojeEmSaoPaulo() {
  const [ano, mes, dia] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" })
    .format(new Date())
    .split("-");
  return `${dia}/${mes}/${ano}`;
}

async function acompanhar(page: Page) {
  await page.goto(`/serie/${ID}`);
  await page.getByRole("button", { name: "Avisar sobre novos episódios" }).click();
  await expect(page.getByRole("button", { name: "Acompanhando" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
}

test("acompanhar uma série com episódio de hoje mostra o aviso no início até marcar como lido", async ({
  page,
}) => {
  await cadastrar(page, "Nina Prado", emailAleatorio("e2e"));
  await concluirOnboarding(page);

  // Sem série acompanhada, o cartão não aparece.
  await expect(page.getByTestId("resumo-preferencias")).toBeVisible();
  await expect(cartao(page)).toHaveCount(0);

  await acompanhar(page);
  await page.goto("/dashboard");

  await expect(cartao(page)).toBeVisible();
  await expect(cartao(page).getByRole("listitem")).toHaveCount(1);
  await expect(cartao(page).getByText(AVISO)).toBeVisible();
  await expect(cartao(page).getByText(`Estreou em ${hojeEmSaoPaulo()}`)).toBeVisible();
  // O episódio de 2099 fica guardado, mas não aparece antes da estreia.
  await expect(cartao(page)).not.toContainText("temporada 3");
  await expect(cartao(page).getByRole("link", { name: "Ver temporada 2" })).toHaveAttribute(
    "href",
    `/serie/${ID}/temporada/2`,
  );

  await cartao(page).getByRole("button", { name: "Marcar como lido" }).click();
  await expect(cartao(page)).toHaveCount(0);

  await page.reload();
  await expect(page.getByTestId("resumo-preferencias")).toBeVisible();
  await expect(cartao(page)).toHaveCount(0);
});

test("deixar de acompanhar tira o aviso do início", async ({ page }) => {
  await cadastrar(page, "Otávio Luz", emailAleatorio("e2e"));
  await concluirOnboarding(page);
  await acompanhar(page);
  await page.goto("/dashboard");
  await expect(cartao(page).getByText(AVISO)).toBeVisible();

  await page.goto(`/serie/${ID}`);
  await page.getByRole("button", { name: "Acompanhando" }).click();
  await expect(page.getByRole("button", { name: "Avisar sobre novos episódios" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  await page.goto("/dashboard");
  await expect(page.getByTestId("resumo-preferencias")).toBeVisible();
  await expect(cartao(page)).toHaveCount(0);
});
