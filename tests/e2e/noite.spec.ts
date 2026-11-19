import { expect, test, type Page } from "@playwright/test";

import { emailAleatorio } from "../support/supabase-local";
import { cadastrar, concluirOnboarding, RESUMO_ONBOARDING } from "./helpers";

/** Pessoa nova, com o onboarding padrão (sem streamings), já no dashboard. */
async function novaPessoa(page: Page, nome: string) {
  await cadastrar(page, nome, emailAleatorio("e2e"));
  await concluirOnboarding(page);
}

const main = (page: Page) => page.getByRole("main");

/** Clica nos cartões das respostas, conferindo a pergunta de cada tela. */
async function responder(page: Page, respostas: [string, string, string]) {
  const perguntas = [
    "Como você está se sentindo?",
    "Que tipo de experiência você quer?",
    "Com quem vai assistir?",
  ];
  for (const [indice, resposta] of respostas.entries()) {
    await expect(main(page).getByRole("heading", { level: 1 })).toHaveText(perguntas[indice]!);
    const cartao = main(page).getByRole("link", { name: resposta, exact: true });
    await expect(cartao).toBeInViewport();
    await cartao.click();
  }
}

/** Títulos do destaque e das opções menores, na ordem da tela. */
async function titulosNaTela(page: Page) {
  const destaque = await main(page).getByRole("heading", { level: 1 }).textContent();
  const opcoes = await main(page)
    .getByRole("region", { name: "Ou talvez" })
    .getByRole("heading", { level: 3 })
    .allTextContents();
  return [destaque ?? "", ...opcoes];
}

/** "Esse não" → motivo, esperando a próxima rodada aparecer com as 2 opções. */
async function trocar(page: Page, motivo: string) {
  const anterior = await main(page).getByRole("heading", { level: 1 }).textContent();
  await main(page).getByRole("button", { name: "Esse não" }).click();
  await main(page)
    .getByRole("group", { name: "Por que não?" })
    .getByRole("button", { name: motivo })
    .click();
  await expect(main(page).getByRole("heading", { level: 1 })).not.toHaveText(anterior ?? "");
  await expect(
    main(page).getByRole("region", { name: "Ou talvez" }).getByRole("heading", { level: 3 }),
  ).toHaveCount(2);
}

test("do dashboard à recomendação em 4 cliques, com motivo, 'termina às' e trailer", async ({
  page,
}) => {
  await novaPessoa(page, "Nina Prado");

  await main(page).getByRole("link", { name: "O que ver hoje?" }).click();
  await expect(page).toHaveURL("/noite");
  await responder(page, ["Cansado", "Rir", "A dois"]);

  await expect(page).toHaveURL("/noite?humor=cansado&exp=rir&com=a-dois");
  await expect(main(page).getByRole("heading", { level: 1 })).toHaveText("Filme 35020");
  await expect(main(page).getByTestId("motivo-noite")).toHaveText(
    /^Você está cansado, quer rir e vai ver a dois: comédia leve, nota \d,\d, está na Netflix\.$/,
  );
  await expect(main(page).getByText(/^Começando agora, termina às \d{1,2}h\d{2}$/)).toBeVisible();
  await expect(main(page).getByRole("button", { name: "Assistir trailer" })).toBeVisible();
  await expect(main(page).getByText("Trocas restantes: 5")).toBeVisible();
});

test("'Voltar' volta à pergunta anterior", async ({ page }) => {
  await novaPessoa(page, "Otto Reis");
  await main(page).getByRole("link", { name: "O que ver hoje?" }).click();
  await main(page).getByRole("link", { name: "Animado" }).click();
  await expect(main(page).getByRole("heading", { level: 1 })).toHaveText(
    "Que tipo de experiência você quer?",
  );

  await main(page).getByRole("button", { name: "Voltar" }).click();

  await expect(page).toHaveURL("/noite");
  await expect(main(page).getByRole("heading", { level: 1 })).toHaveText(
    "Como você está se sentindo?",
  );
});

test("'Esse não' traz 3 opções sem repetir e, no limite de trocas, oferece refazer", async ({
  page,
}) => {
  await novaPessoa(page, "Pia Souza");
  await page.goto("/noite?humor=animado&exp=distrair&com=amigos");
  const mostrados = new Set(await titulosNaTela(page));
  expect(mostrados.size).toBe(1);

  for (let troca = 1; troca <= 5; troca++) {
    await trocar(page, "Outro");
    await expect(page).toHaveURL(new RegExp(`&trocas=${troca}$`));

    const titulos = await titulosNaTela(page);
    expect(new Set(titulos).size).toBe(3);
    for (const titulo of titulos) {
      expect(mostrados.has(titulo), `${titulo} já tinha aparecido`).toBe(false);
      mostrados.add(titulo);
    }
    if (troca < 5)
      await expect(main(page).getByText(`Trocas restantes: ${5 - troca}`)).toBeVisible();
  }

  await expect(main(page).getByRole("button", { name: "Esse não" })).toHaveCount(0);
  await expect(main(page).getByText("Você chegou ao limite de trocas.")).toBeVisible();
  await main(page).getByRole("link", { name: "Refazer as perguntas" }).click();
  await expect(page).toHaveURL("/noite");
  await expect(main(page).getByRole("heading", { level: 1 })).toHaveText(
    "Como você está se sentindo?",
  );
});

test("'Família com crianças' só traz filmes com classificação até 12 anos", async ({ page }) => {
  await novaPessoa(page, "Rui Lima");
  await page.goto("/noite");
  await responder(page, ["De boa", "Rir", "Família com crianças"]);
  await expect(main(page).getByRole("heading", { level: 1 })).toHaveText(/^Para a família \d+$/);

  await trocar(page, "Não é o clima");

  for (const titulo of await titulosNaTela(page)) expect(titulo).toMatch(/^Para a família /);
});

test("o wizard e a escolha não mudam o perfil nem o dashboard", async ({ page }) => {
  await novaPessoa(page, "Sara Nunes");
  const antes = await preferenciasNoPerfil(page);

  await page.goto("/dashboard");
  await main(page).getByRole("link", { name: "O que ver hoje?" }).click();
  await responder(page, ["Ansioso", "Ficar tenso", "Sozinho"]);
  await main(page).getByRole("button", { name: "Vou ver esse!" }).click();
  await expect(main(page).getByRole("status")).toContainText("Boa sessão!");
  await expect(main(page).getByRole("button", { name: "Esse não" })).toHaveCount(0);

  expect(await preferenciasNoPerfil(page)).toEqual(antes);
  await page.goto("/dashboard");
  await expect(page.getByTestId("resumo-preferencias")).toHaveText(RESUMO_ONBOARDING);
});

test("no celular (390 × 844), o fluxo cabe na tela e os botões principais funcionam", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await novaPessoa(page, "Tais Mota");

  const botaoNoite = main(page).getByRole("link", { name: "O que ver hoje?" });
  await expect(botaoNoite).toBeInViewport();
  await botaoNoite.click();
  await responder(page, ["Pra baixo", "Me emocionar", "A dois"]);

  const vouVer = main(page).getByRole("button", { name: "Vou ver esse!" });
  const esseNao = main(page).getByRole("button", { name: "Esse não" });
  await expect(vouVer).toBeInViewport();
  await expect(esseNao).toBeInViewport();
  // Nada cortado nem rolagem para o lado.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  await esseNao.click();
  const motivos = main(page).getByRole("group", { name: "Por que não?" });
  await expect(motivos.getByRole("button", { name: "Muito longo" })).toBeInViewport();
  await motivos.getByRole("button", { name: "Muito longo" }).click();
  await expect(page).toHaveURL(/&max=105&/);
  await expect(main(page).getByRole("region", { name: "Ou talvez" })).toBeVisible();

  await main(page).getByRole("button", { name: "Vou ver esse!" }).first().click();
  await expect(main(page).getByRole("status")).toContainText("Boa sessão!");
});

test.describe("'Até que horas?'", () => {
  // O horário que vale é o do navegador: fuso de São Paulo e relógio fixo em 23h30.
  test.use({ timezoneId: "America/Sao_Paulo" });

  test("é opcional, avisa quando já passou e atravessa a meia-noite, no celular", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await novaPessoa(page, "Ugo Dias");
    await page.clock.setFixedTime(new Date("2026-11-18T23:30:00-03:00"));
    await page.goto("/dashboard");

    // Os 4 cliques continuam os mesmos, com "Tanto faz" já marcado.
    await main(page).getByRole("link", { name: "O que ver hoje?" }).click();
    await responder(page, ["Cansado", "Rir", "A dois"]);
    await expect(page).toHaveURL("/noite?humor=cansado&exp=rir&com=a-dois");
    const titulo = main(page).getByRole("heading", { level: 1 });
    await expect(titulo).toHaveText("Filme 35020");
    const horario = main(page).getByRole("group", { name: "Até que horas?" });
    await expect(horario.getByRole("button", { name: "Tanto faz" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // 23h já passou: nada de sugestão que estoura o horário.
    await horario.getByRole("button", { name: "23h" }).click();
    await expect(page).toHaveURL("/noite?humor=cansado&exp=rir&com=a-dois&ate=23&tempo=0");
    await expect(titulo).toHaveText("Não dá tempo de ver um filme até as 23h");
    await expect(main(page).getByText(/^Esse horário já passou\./)).toBeVisible();
    await expect(main(page).getByRole("link", { name: "Refazer as perguntas" })).toBeVisible();

    // Até 1h: 90 minutos, virando a meia-noite.
    await horario.getByRole("button", { name: "1h" }).click();
    await expect(page).toHaveURL(/&ate=1&tempo=90$/);
    await expect(titulo).toHaveText(/^Curto \d+$/);
    await expect(main(page).getByText("Começando agora, termina às 0h50")).toBeVisible();
    await expect(main(page).getByRole("button", { name: "Vou ver esse!" })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );

    await horario.getByRole("button", { name: "Tanto faz" }).click();
    await expect(page).toHaveURL("/noite?humor=cansado&exp=rir&com=a-dois");
    await expect(titulo).toHaveText("Filme 35020");
  });
});

test("sem sessão, /noite leva ao login guardando as respostas", async ({ page }) => {
  await page.goto("/noite?humor=cansado");
  await expect(page).toHaveURL(/\/login\?next=%2Fnoite%3Fhumor%3Dcansado$/);
});

/** Estado dos chips e das opções de "Suas preferências" no /perfil. */
async function preferenciasNoPerfil(page: Page) {
  await page.goto("/perfil");
  const regiao = main(page).getByRole("region", { name: "Suas preferências" });
  await expect(regiao).toBeVisible();
  return regiao
    .locator("[aria-pressed], input")
    .evaluateAll((elementos) =>
      elementos.map((el) =>
        el instanceof HTMLInputElement
          ? `${el.name}=${el.value}:${el.checked}`
          : `${el.textContent}:${el.getAttribute("aria-pressed")}`,
      ),
    );
}
