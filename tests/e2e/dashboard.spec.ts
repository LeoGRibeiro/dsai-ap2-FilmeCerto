import { expect, test, type Page } from "@playwright/test";

import { emailAleatorio } from "../support/supabase-local";
import { cadastrar, concluirOnboarding, titulosDasSecoes } from "./helpers";

const SERIES = "Séries para hoje à noite";

/** Links dos cartões da seção de séries, na ordem em que aparecem. */
async function linksDasSeries(page: Page) {
  return page
    .getByRole("main")
    .getByRole("region", { name: SERIES })
    .getByRole("link")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
}

/** IDs de todos os filmes na página, na ordem em que aparecem. */
async function idsDosFilmes(page: Page) {
  const hrefs = await page
    .getByRole("main")
    .locator('a[href^="/filme/"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  return hrefs;
}

test("o dashboard mostra as seções do motor com cards e motivos", async ({ page }) => {
  await cadastrar(page, "Iara Dias", emailAleatorio("e2e"));
  await concluirOnboarding(page);

  const main = page.getByRole("main");
  for (const titulo of ["Escolhidos para você", "Ação para você", "Drama para você"]) {
    const secao = main.getByRole("region", { name: titulo });
    await expect(secao).toBeVisible();
    await expect(secao.getByRole("listitem").first()).toBeVisible();
    await expect(secao.getByText(/^Porque você curte /).first()).toBeVisible();
  }

  const primeiro = main
    .getByRole("region", { name: "Escolhidos para você" })
    .getByRole("link")
    .first();
  await expect(primeiro).toHaveAttribute("href", /^\/filme\/\d+$/);
});

test("'Gerar outras recomendações' avança a rodada e troca os filmes", async ({ page }) => {
  await cadastrar(page, "João Lopes", emailAleatorio("e2e"));
  await concluirOnboarding(page);
  const antes = await idsDosFilmes(page);

  await page.getByRole("link", { name: "Gerar outras recomendações" }).click();
  await expect(page).toHaveURL("/dashboard?rodada=1");
  await expect(page.getByRole("region", { name: "Escolhidos para você" })).toBeVisible();

  expect(await idsDosFilmes(page)).not.toEqual(antes);
});

test("uma seção que falha mostra o erro e as outras carregam", async ({ page }) => {
  await cadastrar(page, "Kátia Moura", emailAleatorio("e2e"));
  await expect(page).toHaveURL("/onboarding");
  await concluirOnboarding(page, ["Documentário", "Drama"]);
  const main = page.getByRole("main");

  const documentario = main.getByRole("region", { name: "Documentário para você" });
  await expect(documentario.getByText("Não foi possível carregar agora.")).toBeVisible();
  await expect(documentario.getByRole("link", { name: "Tentar de novo" })).toBeVisible();

  const drama = main.getByRole("region", { name: "Drama para você" });
  await expect(drama.getByRole("listitem").first()).toBeVisible();
});

test("o dashboard mostra 'Séries para hoje à noite', e o cartão leva à página da série", async ({
  page,
}) => {
  await cadastrar(page, "Lia Campos", emailAleatorio("e2e"));
  await concluirOnboarding(page);
  const main = page.getByRole("main");

  // Ação vira Action & Adventure em TV; a seção vem depois das seções de filmes.
  await expect(main.getByRole("region", { name: "Escolhidos para você" })).toBeVisible();
  const series = main.getByRole("region", { name: SERIES });
  await expect(series.getByRole("listitem")).toHaveCount(12);
  await expect(series.getByText("Porque você curte Action & Adventure").first()).toBeVisible();
  expect((await titulosDasSecoes(page)).at(-1)).toBe(SERIES);

  // "Gerar outras recomendações" troca as séries também.
  const antes = await linksDasSeries(page);
  expect(antes.every((href) => /^\/serie\/\d+$/.test(href ?? ""))).toBe(true);
  await page.getByRole("link", { name: "Gerar outras recomendações" }).click();
  await expect(page).toHaveURL("/dashboard?rodada=1");
  // A seção recarrega no próprio Suspense: espera os 12 cartões novos.
  await expect
    .poll(async () => {
      const links = await linksDasSeries(page);
      return links.length === 12 && links.join() !== antes.join();
    })
    .toBe(true);
  const depois = await linksDasSeries(page);

  const destino = depois[0] ?? "";
  await series.getByRole("link").first().click();
  await expect(page).toHaveURL(destino);
  await expect(main.getByRole("heading", { level: 1 })).toHaveText(
    `Série ${destino.split("/").at(-1)}`,
  );
});

test("no celular (390 × 844), a seção de séries não cria rolagem para o lado", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await cadastrar(page, "Mário Reis", emailAleatorio("e2e"));
  await concluirOnboarding(page);

  const series = page.getByRole("main").getByRole("region", { name: SERIES });
  await expect(series.getByRole("listitem").first()).toBeVisible();
  await series.scrollIntoViewIfNeeded();
  await expect(series.getByRole("heading", { name: SERIES })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
