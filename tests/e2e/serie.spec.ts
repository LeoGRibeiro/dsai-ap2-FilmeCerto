import { expect, test, type Page } from "@playwright/test";

import { emailAleatorio } from "../support/supabase-local";
import { cadastrar, concluirOnboarding } from "./helpers";

/** No TMDB falso, /tv/1399 é "Série 1399" e /movie/1399 é "Filme 1399": o mesmo ID é os dois. */
const ID = 1399;

const botao = (page: Page, grupo: string, nome: string) =>
  page.getByRole("group", { name: grupo }).getByRole("button", { name: nome });

/** Clica num botão de um grupo e espera a Server Action terminar. */
async function clicar(page: Page, grupo: string, nome: string, marcado: "true" | "false") {
  await botao(page, grupo, nome).click();
  await expect(botao(page, grupo, nome)).toBeEnabled();
  await expect(botao(page, grupo, nome)).toHaveAttribute("aria-pressed", marcado);
}

const secao = (page: Page, titulo: string) =>
  page
    .getByRole("main")
    .locator("section")
    .filter({ has: page.getByRole("heading", { level: 2, name: titulo }) });

async function entrarComOnboarding(page: Page, nome: string) {
  await cadastrar(page, nome, emailAleatorio("e2e"));
  await concluirOnboarding(page);
}

test("a página da série mostra temporadas, episódio, elenco, onde assistir e trailer", async ({
  page,
}) => {
  await entrarComOnboarding(page, "Sara Lima");
  await page.goto(`/serie/${ID}`);

  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1 })).toHaveText(`Série ${ID}`);
  await expect(page).toHaveTitle(/^Série 1399 \(\d{4}\) · Filme Certo$/);
  for (const dado of ["2 temporadas", "Episódios de 45min", "12 anos"]) {
    await expect(main.getByText(dado, { exact: true })).toBeVisible();
  }
  await expect(main.getByText(`Sinopse da Série ${ID}.`)).toBeVisible();
  await expect(main.getByText("Criação: Criadora Teste")).toBeVisible();

  const temporadas = secao(page, "Temporadas").getByRole("listitem");
  await expect(temporadas).toHaveCount(2);
  await expect(temporadas.first()).toContainText("Temporada 1");
  await expect(temporadas.first()).toContainText("10 episódios");
  await expect(secao(page, "Temporadas")).not.toContainText("Especiais");

  await expect(secao(page, "Onde assistir no Brasil").getByText("Netflix")).toBeVisible();
  await expect(secao(page, "Elenco").getByText("Atriz Um")).toBeVisible();

  await expect(main.locator("iframe")).toHaveCount(0);
  await main.getByRole("button", { name: "Assistir trailer" }).click();
  await expect(
    main.locator('iframe[src*="youtube-nocookie.com/embed/trailer-serie-falso"]'),
  ).toHaveCount(1);
});

test("reação e lista da série ficam na série, não no filme de mesmo ID, e aparecem em /listas", async ({
  page,
}) => {
  await entrarComOnboarding(page, "Tomás Brito");
  await page.goto(`/serie/${ID}`);

  await clicar(page, "O que achou?", "Amei", "true");
  await clicar(page, "Minhas listas", "Quero assistir", "true");
  await page.reload();
  await expect(botao(page, "O que achou?", "Amei")).toHaveAttribute("aria-pressed", "true");
  await expect(botao(page, "Minhas listas", "Quero assistir")).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.goto(`/filme/${ID}`);
  await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toHaveText(`Filme ${ID}`);
  for (const nome of ["Não é pra mim", "Gostei", "Amei"]) {
    await expect(botao(page, "O que achou?", nome)).toHaveAttribute("aria-pressed", "false");
  }
  for (const nome of ["Quero assistir", "Já assisti"]) {
    await expect(botao(page, "Minhas listas", nome)).toHaveAttribute("aria-pressed", "false");
  }

  await page.goto("/listas");
  await expect(page.getByRole("link", { name: "Quero assistir (1)" })).toBeVisible();
  const cartao = page.getByRole("main").locator(`a[href="/serie/${ID}"]`);
  await expect(cartao).toContainText("Série");
  await expect(page.getByRole("main").getByText("Amei")).toBeVisible();
  await cartao.click();
  await expect(page).toHaveURL(`/serie/${ID}`);
});

test("série inexistente ou ID inválido mostram o 404", async ({ page }) => {
  await entrarComOnboarding(page, "Vera Dias");

  for (const rota of ["/serie/999999999", "/serie/abc"]) {
    await page.goto(rota);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Página não encontrada");
  }
});

test("sem sessão, a página da série exige login", async ({ page }) => {
  await page.goto(`/serie/${ID}`);
  await expect(page).toHaveURL(`/login?next=%2Fserie%2F${ID}`);
});

test("no celular, os botões da série ficam visíveis e clicáveis, sem rolagem lateral", async ({
  page,
}) => {
  await entrarComOnboarding(page, "Ivo Nunes");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/serie/${ID}`);

  await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
  for (const [grupo, nome] of [
    ["O que achou?", "Não é pra mim"],
    ["O que achou?", "Gostei"],
    ["O que achou?", "Amei"],
    ["Minhas listas", "Quero assistir"],
    ["Minhas listas", "Já assisti"],
  ]) {
    await expect(botao(page, grupo, nome)).toBeVisible();
  }
  await clicar(page, "O que achou?", "Gostei", "true");
  await clicar(page, "Minhas listas", "Já assisti", "true");

  const largura = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(largura).toBeLessThanOrEqual(390);
});
