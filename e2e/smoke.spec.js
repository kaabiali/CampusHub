import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const MAILPIT = 'http://localhost:8025/api/v1';
const DEMO_PASSWORD = 'campus2026';

async function verificationLink(request, email) {
  for (let i = 0; i < 20; i++) {
    const search = await (await request.get(`${MAILPIT}/search`, { params: { query: `to:"${email}"` } })).json();
    if (search.messages?.length) {
      const message = await (await request.get(`${MAILPIT}/message/${search.messages[0].ID}`)).json();
      return message.Text.match(/https?:\/\/\S+verifier-email\?jeton=[\w-]+/)[0];
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Aucun e-mail reçu pour ${email} (Mailpit est-il lancé ?)`);
}

async function loginAs(page, email) {
  const res = await page.request.post('/api/auth/connexion', { data: { email, motDePasse: DEMO_PASSWORD } });
  expect(res.ok(), `Connexion de ${email} impossible : lancez « npm run seed » avant les tests E2E.`).toBeTruthy();
}

test('inscription, vérification, profil puis publication d’un livre', async ({ page, request }) => {
  const email = `e2e.${Date.now()}@campus.tn`;
  await page.goto('/inscription');
  await page.getByLabel('Prénom').fill('Lina');
  await page.getByLabel('Nom', { exact: true }).fill('Testeuse');
  await page.getByLabel('E-mail universitaire').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill('motdepasse1');
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page.getByRole('heading', { name: 'Vérifiez votre boîte de réception' })).toBeVisible();

  await page.goto(await verificationLink(request, email));
  await expect(page.getByRole('heading', { name: 'Adresse confirmée' })).toBeVisible();
  await page.getByRole('button', { name: 'Compléter mon profil' }).click();
  await page.getByRole('button', { name: 'Probabilités', exact: true }).click();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Profil enregistré.')).toBeVisible();

  await page.goto('/livres?publier=1');
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel('Titre du livre').fill('Probabilités, recueil d’exercices');
  await sheet.getByLabel('Catégorie').click();
  await page.getByRole('option', { name: 'Mathématiques' }).click();
  await sheet.getByLabel('Matière').fill('Probabilités');
  await sheet.getByLabel('Année d’édition').fill('2022');
  await sheet.getByLabel('Prix neuf (DT)').fill('40');
  await sheet.getByRole('button', { name: 'Appliquer' }).click();
  await expect(sheet.getByLabel('Votre prix (DT)')).not.toHaveValue('');
  await sheet.getByRole('button', { name: 'Publier', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Probabilités, recueil d’exercices' }).first()).toBeVisible();
  await expect(page.getByText(/fourchette conseillée|prix conseillé/).first()).toBeVisible();
});

test('un étudiant réserve un trajet et écrit au conducteur, qui reçoit le message en direct', async ({ browser }) => {
  const passengerContext = await browser.newContext();
  const driverContext = await browser.newContext();
  const passenger = await passengerContext.newPage();
  const driver = await driverContext.newPage();
  await loginAs(passenger, 'lina.ferchichi@campus.tn');
  await loginAs(driver, 'nour.hammami@campus.tn');
  await driver.goto('/accueil');

  await passenger.goto('/covoiturage?depart=sidi');
  const card = passenger.locator('article').filter({ hasText: 'Sidi Bou Saïd' }).filter({ hasText: 'Nour Hammami' });
  await expect(card).toBeVisible();
  const reserve = card.getByRole('button', { name: 'Réserver' });
  if (await reserve.count()) {
    await reserve.click();
    await expect(passenger.getByText('Place réservée. Le conducteur est prévenu.')).toBeVisible();
  }
  await expect(card.getByText('Réservé')).toBeVisible();

  await card.getByRole('link').first().click();
  await passenger.getByRole('link', { name: /Écrire à Nour/ }).click();
  const text = `Je serai à la gare à 07:35 (${Date.now()})`;
  await passenger.getByLabel('Votre message').fill(text);
  await passenger.keyboard.press('Enter');
  await expect(passenger.getByText('Envoyé')).toBeVisible();

  await expect(driver.getByText('Message de Lina')).toBeVisible();
  await driver.goto('/messages');
  await driver.getByRole('link', { name: /Lina Ferchichi/ }).click();
  await expect(driver.getByRole('region', { name: /Conversation avec Lina/ }).getByText(text)).toBeVisible();
  await expect(passenger.getByText(text).locator('..').getByText('Lu', { exact: true })).toBeVisible();
  await passengerContext.close();
  await driverContext.close();
});

for (const colorScheme of ['light', 'dark']) {
test(`aucune violation d’accessibilité grave sur les pages clés (thème ${colorScheme === 'dark' ? 'sombre' : 'clair'})`, async ({ browser }) => {
  const context = await browser.newContext({ colorScheme });
  const page = await context.newPage();
  const audit = async (path) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    return violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${path}: ${v.id} (${v.nodes.length}) ${v.help}`);
  };
  const problems = [];
  for (const path of ['/', '/connexion', '/inscription']) problems.push(...(await audit(path)));
  await loginAs(page, 'ines.ayari@campus.tn');
  for (const path of ['/accueil', '/livres', '/covoiturage', '/groupes', '/evenements', '/messages']) problems.push(...(await audit(path)));
  expect(problems).toEqual([]);
  await context.close();
});
}
