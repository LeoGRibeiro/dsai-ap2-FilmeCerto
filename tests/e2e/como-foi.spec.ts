import { expect, test, type Page } from "@playwright/test";

import { SENHA_TESTE, emailAleatorio, novoCliente } from "../support/supabase-local";
import { cadastrar, concluirOnboarding } from "./helpers";

/**
 * Cadastra uma pessoa e grava, em nome dela, uma escolha da noite feita há `horas` horas.
 * As telas do wizard ainda não existem; a escolha entra pela API, como o "Vou ver esse!" faria.
 */
async function comEscolha(
  page: Page,
  nome: string,
  tmdbId: number,
  horas: number,
  tipo: "filme" | "serie" = "filme",
) {
  const email = emailAleatorio("e2e");
  await cadastrar(page, nome, email);
  await concluirOnboarding(page);

  const cliente = novoCliente();
  const { error: erroLogin } = await cliente.auth.signInWithPassword({
    email,
    password: SENHA_TESTE,
  });
  expect(erroLogin).toBeNull();
  const { error } = await cliente.from("escolhas_noite").insert({
    tipo,
    tmdb_id: tmdbId,
    titulo: `${tipo === "serie" ? "Série" : "Filme"} ${tmdbId}`,
    escolhido_em: new Date(Date.now() - horas * 3_600_000).toISOString(),
  });
  expect(error).toBeNull();

  await page.goto("/dashboard");
}

const cartao = (page: Page) => page.getByRole("complementary", { name: /^Como foi/ });

const pressionado = (page: Page, grupo: string, nome: string) =>
  page.getByRole("group", { name: grupo }).getByRole("button", { name: nome });

test("Amei grava a reação e 'Já assisti' e tira a pergunta", async ({ page }) => {
  await comEscolha(page, "Rita Lobo", 4242, 4);

  await expect(cartao(page).getByRole("heading")).toHaveText("Como foi Filme 4242?");
  await cartao(page).getByRole("button", { name: "Amei" }).click();
  await expect(cartao(page)).toHaveCount(0);

  await page.goto("/filme/4242");
  await expect(pressionado(page, "O que achou?", "Amei")).toHaveAttribute("aria-pressed", "true");
  await expect(pressionado(page, "Minhas listas", "Já assisti")).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.goto("/dashboard");
  await expect(page.getByRole("region", { name: "Escolhidos para você" })).toBeVisible();
  await expect(cartao(page)).toHaveCount(0);
});

test("de uma série, Amei marca a série e não o filme de mesmo ID", async ({ page }) => {
  await comEscolha(page, "Ivo Matos", 4545, 4, "serie");

  await expect(cartao(page).getByRole("heading")).toHaveText("Como foi Série 4545?");
  await expect(cartao(page).getByRole("link", { name: "Série 4545" })).toHaveAttribute(
    "href",
    "/serie/4545",
  );
  await cartao(page).getByRole("button", { name: "Amei" }).click();
  await expect(cartao(page)).toHaveCount(0);

  await page.goto("/serie/4545");
  await expect(pressionado(page, "O que achou?", "Amei")).toHaveAttribute("aria-pressed", "true");
  await expect(pressionado(page, "Minhas listas", "Já assisti")).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.goto("/filme/4545");
  await expect(pressionado(page, "O que achou?", "Amei")).toHaveAttribute("aria-pressed", "false");
  await expect(pressionado(page, "Minhas listas", "Já assisti")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("'Não cheguei a ver' tira a pergunta sem marcar nada", async ({ page }) => {
  await comEscolha(page, "Caio Duarte", 4343, 5);

  await cartao(page).getByRole("button", { name: "Não cheguei a ver" }).click();
  await expect(cartao(page)).toHaveCount(0);

  await page.goto("/filme/4343");
  for (const nome of ["Não é pra mim", "Gostei", "Amei"]) {
    await expect(pressionado(page, "O que achou?", nome)).toHaveAttribute("aria-pressed", "false");
  }
  await expect(pressionado(page, "Minhas listas", "Já assisti")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("uma escolha recém-feita ainda não é perguntada", async ({ page }) => {
  await comEscolha(page, "Lia Torres", 4444, 0);

  await expect(page.getByRole("region", { name: "Escolhidos para você" })).toBeVisible();
  await expect(cartao(page)).toHaveCount(0);
});
