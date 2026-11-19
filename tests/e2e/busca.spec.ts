import { expect, test } from "@playwright/test";

import { emailAleatorio } from "../support/supabase-local";
import { cadastrar, concluirOnboarding } from "./helpers";

test("busca por nome pelo header, paginação, abrir filme e sem resultados", async ({ page }) => {
  await cadastrar(page, "Rui Tavares", emailAleatorio("e2e"));
  await concluirOnboarding(page);

  const campo = page.getByRole("banner").getByRole("searchbox", { name: "Buscar filmes" });
  await campo.fill("matrix");
  await campo.press("Enter");

  await expect(page).toHaveURL("/busca?q=matrix");
  const main = page.getByRole("main");
  await expect(main.getByText("55 resultados para “matrix”")).toBeVisible();
  await expect(main.getByRole("listitem").first()).toBeVisible();

  await main.getByRole("link", { name: "Próxima" }).click();
  await expect(page).toHaveURL("/busca?q=matrix&pagina=2");
  await expect(main.getByText("Página 2 de 3")).toBeVisible();

  const card = main.getByRole("list").getByRole("link").first();
  const href = await card.getAttribute("href");
  await card.click();
  await expect(page).toHaveURL(href ?? "");

  await page.goto("/busca?q=nada");
  await expect(main.getByText("Nenhum filme encontrado para “nada”.")).toBeVisible();
});

test("busca por nome na aba Séries encontra séries e abre a página da série", async ({ page }) => {
  await cadastrar(page, "Vera Lins", emailAleatorio("e2e"));
  await concluirOnboarding(page);

  const campo = page.getByRole("banner").getByRole("searchbox", { name: "Buscar filmes e séries" });
  await expect(campo).toHaveAttribute("placeholder", "Buscar filmes e séries");
  await campo.fill("dark");
  await campo.press("Enter");
  await expect(page).toHaveURL("/busca?q=dark");

  const main = page.getByRole("main");
  const abas = main.getByRole("navigation", { name: "Tipo de título" });
  await abas.getByRole("link", { name: "Séries" }).click();
  await expect(page).toHaveURL("/busca?q=dark&tipo=serie");
  await expect(abas.getByRole("link", { name: "Séries" })).toHaveAttribute("aria-current", "page");
  await expect(main.getByText("55 resultados para “dark”")).toBeVisible();

  // A paginação mantém a aba: os IDs da página 2 do TMDB falso começam em 500040.
  await main.getByRole("link", { name: "Próxima" }).click();
  await expect(page).toHaveURL("/busca?q=dark&tipo=serie&pagina=2");
  const cartao = main.getByRole("list").getByRole("link", { name: /^dark 2-1 \(\d{4}\), série$/ });
  await expect(cartao).toHaveAttribute("href", "/serie/500040");
  await cartao.click();
  await expect(page).toHaveURL("/serie/500040");
  await expect(main.getByRole("heading", { level: 1 })).toHaveText("Série 500040");

  await page.goto("/busca?q=nada&tipo=serie");
  await expect(main.getByText("Nenhuma série encontrada para “nada”.")).toBeVisible();
});

test("busca por filtros mantém os campos e mostra os filmes do gênero", async ({ page }) => {
  await cadastrar(page, "Sara Moura", emailAleatorio("e2e"));
  await concluirOnboarding(page);

  await page.goto("/busca");
  const main = page.getByRole("main");
  await main.getByRole("link", { name: "Por filtros" }).click();
  await expect(page).toHaveURL("/busca?modo=filtros");

  await main.getByLabel("Gênero").selectOption({ label: "Terror" });
  await main.getByLabel("Duração").selectOption({ label: "Curtos (até 90 min)" });
  await main.getByLabel("Ordenar por").selectOption({ label: "Mais bem avaliados" });
  await main.getByRole("button", { name: "Aplicar filtros" }).click();

  await expect(page).toHaveURL(/modo=filtros/);
  const url = new URL(page.url());
  expect(url.searchParams.get("genero")).toBe("27");
  expect(url.searchParams.get("duracao")).toBe("curta");
  expect(url.searchParams.get("ordem")).toBe("nota");

  await expect(main.getByText(/filmes encontrados$/)).toBeVisible();
  await expect(main.getByRole("link", { name: /^Terror / }).first()).toBeVisible();
  await expect(main.getByLabel("Gênero")).toHaveValue("27");
  await expect(main.getByLabel("Ordenar por")).toHaveValue("nota");
});

test("sem sessão, a busca exige login", async ({ page }) => {
  await page.goto("/busca?q=matrix");
  await expect(page).toHaveURL("/login?next=%2Fbusca%3Fq%3Dmatrix");
});
