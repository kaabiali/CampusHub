import { test, expect } from '@playwright/test';

const DEMO_PASSWORD = 'campus2026';

async function loginAs(page, email) {
  const res = await page.request.post('/api/auth/connexion', { data: { email, motDePasse: DEMO_PASSWORD } });
  expect(res.ok(), `Connexion de ${email} impossible : lancez « npm run seed » avant les tests E2E.`).toBeTruthy();
}

test('les membres discutent et ouvrent une réunion de groupe', async ({ browser }) => {
  const ownerContext = await browser.newContext();
  const memberContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  const member = await memberContext.newPage();
  await loginAs(owner, 'ines.ayari@campus.tn');
  await loginAs(member, 'nour.hammami@campus.tn');

  const nom = `Groupe E2E ${Date.now()}`;
  const created = await owner.request.post('/api/groupes', { data: { nom, matiere: 'Tests', capaciteMax: 5 } });
  expect(created.ok()).toBeTruthy();
  const group = (await created.json()).groupe;
  expect((await member.request.post(`/api/groupes/${group._id}/membres`)).ok()).toBeTruthy();

  await owner.goto(`/groupes/${group._id}`);
  await expect(owner.getByRole('heading', { name: 'Messagerie du groupe' })).toBeVisible();
  const text = `Message E2E ${Date.now()}`;
  await owner.getByLabel('Votre message au groupe').fill(text);
  await owner.keyboard.press('Enter');
  await expect(owner.getByText(text)).toBeVisible();

  await member.goto(`/groupes/${group._id}`);
  await expect(member.getByText(text)).toBeVisible();

  await member.getByRole('button', { name: 'Ouvrir une réunion' }).click();
  await member.getByRole('dialog').getByLabel('Sujet (facultatif)').fill('Révision E2E');
  await member.getByRole('dialog').getByRole('button', { name: 'Ouvrir la réunion' }).click();
  await expect(member.getByText('Révision E2E')).toBeVisible();
  await expect(owner.getByText('Révision E2E')).toBeVisible();
  await expect(member.getByRole('link', { name: 'Rejoindre la réunion' })).toHaveAttribute('href', /^https:\/\/meet\.jit\.si\//);

  await owner.getByRole('button', { name: 'Terminer la réunion' }).click();
  await expect(owner.getByRole('button', { name: 'Ouvrir une réunion' })).toBeVisible();

  await owner.request.delete(`/api/groupes/${group._id}`);
  await ownerContext.close();
  await memberContext.close();
});
