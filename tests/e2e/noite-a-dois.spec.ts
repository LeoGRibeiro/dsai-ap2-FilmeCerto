import { randomUUID } from "node:crypto";

import { expect, test, type Browser, type Page } from "@playwright/test";

import { emailAleatorio } from "../support/supabase-local";
import { cadastrar, concluirOnboarding, preencherCadastro } from "./helpers";

const main = (page: Page) => page.getByRole("main");

/** Uma pessoa em outro navegador (contexto próprio), com conta e onboarding padrão. */
async function pessoa(browser: Browser, baseURL: string | undefined, nome: string) {
  const contexto = await browser.newContext({ baseURL });
  const page = await contexto.newPage();
  await cadastrar(page, nome, emailAleatorio("e2e"));
  await concluirOnboarding(page);
  return page;
}

/** Cria a sala a partir do wizard e devolve o link para mandar à outra pessoa. */
async function criarSala(page: Page) {
  await page.goto("/noite");
  await main(page).getByRole("button", { name: "Vamos escolher juntos" }).click();
  await expect(page).toHaveURL(/\/noite\/juntos\/[0-9a-f-]{36}$/);
  return main(page).getByRole("textbox", { name: "Link da sala" }).inputValue();
}

/** Os três cartões do wizard, na sala; cada cartão precisa estar visível na tela. */
async function responderNaSala(page: Page, respostas: string[]) {
  for (const resposta of respostas) {
    const cartao = main(page).getByRole("link", { name: resposta, exact: true });
    await expect(cartao).toBeInViewport();
    await cartao.click();
  }
  const enviar = main(page).getByRole("button", { name: "Enviar respostas" });
  await expect(enviar).toBeInViewport();
  await enviar.click();
}

const MOTIVO =
  /^Um quer rir e o outro quer ficar tenso: comédia de ação, nota \d,\d, está na Netflix\.$/;

test("duas pessoas, cada uma no seu celular, veem a mesma sugestão", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const [ana, beto] = await Promise.all([
    pessoa(browser, baseURL, "Ana Lima"),
    pessoa(browser, baseURL, "Beto Sá"),
  ]);

  const link = await criarSala(ana);
  expect(link).toBe(`${baseURL}${new URL(ana.url()).pathname}`);

  await responderNaSala(ana, ["Animado", "Rir", "A dois"]);
  await expect(main(ana).getByRole("heading", { name: /Esperando a outra pessoa/ })).toBeVisible();

  await beto.setViewportSize({ width: 390, height: 844 });
  await beto.goto(link);
  await responderNaSala(beto, ["De boa", "Ficar tenso", "A dois"]);

  // A tela da Ana se atualiza sozinha; as duas mostram o mesmo filme e o mesmo motivo.
  for (const page of [beto, ana]) {
    await expect(main(page).getByRole("heading", { level: 1 })).toHaveText("Filme 35020", {
      timeout: 20_000,
    });
    await expect(main(page).getByTestId("motivo-noite")).toHaveText(MOTIVO);
    await expect(
      main(page).getByRole("region", { name: "Ou talvez" }).getByRole("heading", { level: 3 }),
    ).toHaveText(["Filme 35021", "Filme 35022"]);
  }
  const motivoDaAna = await main(ana).getByTestId("motivo-noite").textContent();
  await expect(main(beto).getByTestId("motivo-noite")).toHaveText(motivoDaAna ?? "");

  // No celular, o "Vou ver esse!" do destaque fica visível e funciona.
  const vouVer = main(beto).getByRole("button", { name: "Vou ver esse!" }).first();
  await vouVer.scrollIntoViewIfNeeded();
  await expect(vouVer).toBeInViewport();
  await vouVer.click();
  await expect(main(beto).getByText(/Boa sessão!/)).toBeVisible();

  // Uma terceira pessoa com o link encontra a sala cheia; um ID qualquer não existe.
  const carla = await pessoa(browser, baseURL, "Carla Dias");
  await carla.goto(link);
  await expect(main(carla).getByRole("heading", { level: 1 })).toHaveText(
    "Essa sala já tem duas pessoas",
  );
  await carla.goto(`/noite/juntos/${randomUUID()}`);
  await expect(main(carla).getByRole("heading", { level: 1 })).toHaveText("Essa sala não existe");
});

test("sem sessão, o link da sala leva ao login guardando o destino", async ({ page }) => {
  const sala = `/noite/juntos/${randomUUID()}`;
  await page.goto(sala);
  await expect(page).toHaveURL(`/login?next=${encodeURIComponent(sala)}`);
});

test("convidado sem conta cria a conta, faz o onboarding e cai na sala", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const ana = await pessoa(browser, baseURL, "Ana Lima");
  const link = await criarSala(ana);
  await responderNaSala(ana, ["Animado", "Rir", "A dois"]);

  const sala = new URL(link).pathname;
  const next = `next=${encodeURIComponent(sala)}`;
  const contexto = await browser.newContext({ baseURL });
  const beto = await contexto.newPage();
  await beto.goto(link);
  await expect(beto).toHaveURL(`/login?${next}`);

  await main(beto).getByRole("link", { name: "Criar conta" }).click();
  await expect(beto).toHaveURL(`/cadastro?${next}`);
  await preencherCadastro(beto, "Beto Sá", emailAleatorio("e2e"));
  await concluirOnboarding(beto, undefined, sala);

  await responderNaSala(beto, ["De boa", "Ficar tenso", "A dois"]);
  await expect(main(beto).getByRole("heading", { level: 1 })).toHaveText("Filme 35020", {
    timeout: 20_000,
  });
});
