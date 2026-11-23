import { expect, test, type Page } from "@playwright/test";

import { emailAleatorio } from "../support/supabase-local";
import { cadastrar, concluirOnboarding } from "./helpers";

/**
 * Filtro por idade (SPEC/2026-11-23-filtro-idade.md), no celular. No TMDB falso, o filme 500021
 * é +18 e o 500022 é 14; na busca "matrix", eles são "matrix 1-2" e "matrix 1-3".
 */
test.use({ viewport: { width: 390, height: 844 } });

async function escolherFiltro(page: Page, opcao: RegExp) {
  await page.goto("/perfil");
  const secao = page.getByRole("region", { name: "Conteúdo sensível" });
  await secao.getByRole("radio", { name: opcao }).check();
  await secao.getByRole("button", { name: "Salvar filtro" }).click();
  await expect(secao.getByRole("status")).toHaveText("Alterações salvas.");
}

const tituloDoFilme = (page: Page, id: number) =>
  page.getByRole("heading", { level: 1, name: `Filme ${id}` });

test("selo sempre; com 'Até 10 anos', aviso no 14 e bloqueio total do +18", async ({ page }) => {
  await cadastrar(page, "Bia Filtro", emailAleatorio("e2e"));
  await concluirOnboarding(page);

  // Sem filtro: a página do +18 abre normalmente, com o selo ao lado da nota.
  await page.goto("/filme/500021");
  await expect(tituloDoFilme(page, 500021)).toBeVisible();
  await expect(page.getByTestId("selo-classificacao")).toContainText("Classificação: 18 anos");
  await expect(page.getByTestId("temas-classificacao")).toHaveText("Temas: violência, medo");
  await expect(page.getByRole("note")).toHaveCount(0);

  await escolherFiltro(page, /Até 10 anos/);

  // 14 acima da idade: a página abre, com a faixa de aviso.
  await page.goto("/filme/500022");
  await expect(tituloDoFilme(page, 500022)).toBeVisible();
  await expect(page.getByRole("note")).toContainText("Não recomendado para menores de 14 anos.");
  await expect(page.getByTestId("temas-classificacao")).toContainText(
    "segundo a classificação da Holanda",
  );

  // +18 pelo link direto: bloqueado, sem o nome nem na página nem na aba.
  await page.goto("/filme/500021");
  await expect(page.getByTestId("titulo-bloqueado")).toBeVisible();
  await expect(page.getByText("Filme 500021")).toHaveCount(0);
  await expect(page.locator("main img")).toHaveCount(0);
  await expect(page).toHaveTitle(/Título indisponível/);

  // Na busca, o +18 some e o 14 continua.
  await page.goto("/busca?q=matrix");
  await expect(page.getByRole("link", { name: /^matrix 1-3 \(/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^matrix 1-2 \(/ })).toHaveCount(0);

  // "Sem filtro": tudo volta.
  await escolherFiltro(page, /Sem filtro/);
  await page.goto("/filme/500021");
  await expect(tituloDoFilme(page, 500021)).toBeVisible();
  await page.goto("/busca?q=matrix");
  await expect(page.getByRole("link", { name: /^matrix 1-2 \(/ })).toBeVisible();
});
