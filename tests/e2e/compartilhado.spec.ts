import { expect, test } from "@playwright/test";

import { emailAleatorio } from "../support/supabase-local";
import { cadastrar, concluirOnboarding, entrar, sair } from "./helpers";

// Página pública do título compartilhado (SPEC/2026-11-25-compartilhar-publico.md). No TMDB
// falso, o 35020 tem pôster e 125 min; o 35021 é +18 no Brasil.
const PAGINA = "/compartilhado/filme/35020";
const POSTER = "https://image.tmdb.org/t/p/w500/falso-35020.jpg";

test.describe("sem conta", () => {
  test("a página pública do filme abre sem login, com duração, onde assistir e o convite", async ({
    page,
  }) => {
    await page.goto(PAGINA);

    await expect(page).toHaveURL(PAGINA);
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toHaveText("Filme 35020");
    await expect(main.getByText("2h 5min")).toBeVisible();
    await expect(main.getByText("Sinopse do Filme 35020.")).toBeVisible();
    await expect(main.getByText("Netflix")).toBeVisible();
    await expect(main.getByRole("link", { name: "Criar conta" })).toHaveAttribute(
      "href",
      "/cadastro",
    );
    await expect(main.getByRole("link", { name: "Entrar" })).toHaveAttribute(
      "href",
      "/login?next=/filme/35020",
    );
    await expect(main.getByRole("button", { name: "Amei" })).toHaveCount(0);
    await expect(page).toHaveTitle("Filme 35020 (2020) · Filme Certo");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", POSTER);
  });

  test("o robô do WhatsApp recebe a página, sem redirecionamento, com o pôster no <head>", async ({
    request,
  }) => {
    const resposta = await request.get(PAGINA, {
      headers: { "user-agent": "WhatsApp/2.24.1 A" },
      maxRedirects: 0,
    });

    expect(resposta.status()).toBe(200);
    const head = (await resposta.text()).split("</head>")[0]!;
    expect(head).toContain(`<meta property="og:image" content="${POSTER}"/>`);
    expect(head).toContain('<meta property="og:title" content="Filme 35020 (2020)"/>');
  });

  test("a série mostra a duração do episódio; o +18 e o título inexistente não mostram o título", async ({
    page,
  }) => {
    await page.goto("/compartilhado/serie/1400");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toHaveText("Série 1400");
    await expect(main.getByText("Episódios de 45min")).toBeVisible();

    await page.goto("/compartilhado/filme/35021");
    await expect(page).toHaveURL("/compartilhado/filme/35021");
    await expect(main.getByRole("heading", { level: 1 })).toHaveText(
      "Título para maiores de 18 anos",
    );
    await expect(main).not.toContainText("Filme 35021");
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);

    await page.goto("/compartilhado/filme/999000001");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Página não encontrada");
  });

  test("a página do filme na área logada continua exigindo login", async ({ page }) => {
    await page.goto("/filme/35020");
    await expect(page).toHaveURL("/login?next=%2Ffilme%2F35020");
  });
});

test("o 'Entrar' da página pública volta ao filme, e quem está logado vai direto a ele", async ({
  page,
}) => {
  const email = emailAleatorio("e2e");
  await cadastrar(page, "Ivo Brandão", email);
  await concluirOnboarding(page);

  await page.goto(PAGINA);
  await expect(page).toHaveURL("/filme/35020");

  await sair(page);
  await page.goto(PAGINA);
  await page.getByRole("main").getByRole("link", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/login?next=/filme/35020");
  await entrar(page, email);
  await expect(page).toHaveURL("/filme/35020");
  await expect(page.getByRole("main").getByRole("button", { name: "Amei" })).toBeVisible();
});
