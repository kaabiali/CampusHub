import { test, expect } from '@playwright/test';

const DEMO_PASSWORD = 'campus2026';

async function loginAs(page, email) {
  const res = await page.request.post('/api/auth/connexion', { data: { email, motDePasse: DEMO_PASSWORD } });
  expect(res.ok(), `Connexion de ${email} impossible : lancez « npm run seed » avant les tests E2E.`).toBeTruthy();
}

test('la carte du covoiturage affiche le trajet et permet de placer les points', async ({ page }) => {
  await loginAs(page, 'ines.ayari@campus.tn');

  // The publish form offers a searchable map picker next to the text fields.
  await page.goto('/covoiturage');
  await expect(page.getByLabel('Itinéraire sur la carte')).toBeVisible();
  const picker = page.locator('form .leaflet-container');
  await expect(picker).toBeVisible();
  await picker.click({ position: { x: 70, y: 110 } });
  await expect(page.getByText(/Point de départ placé/)).toBeVisible();
  await expect(page.locator('form .ch-map-pin__dot--start')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Arrivée' })).toHaveAttribute('aria-pressed', 'false');

  // A seeded ride shows its route on the detail page.
  const search = await page.request.get('/api/trajets?depart=sidi');
  const { trajets } = await search.json();
  expect(trajets.length).toBeGreaterThan(0);
  const ride = trajets.find((t) => t.coordDepart && t.coordArrivee);
  expect(ride, 'les trajets de démonstration doivent avoir des coordonnées (npm run coords:backfill)').toBeTruthy();

  await page.goto(`/covoiturage/${ride._id}`);
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await expect(page.locator('.ch-map-pin__dot--start')).toHaveCount(1);
  await expect(page.locator('.ch-map-pin__dot--end')).toHaveCount(1);
  await expect(page.getByText(/à vol d’oiseau/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Itinéraire routier/ })).toHaveAttribute('href', /openstreetmap\.org\/directions/);
});
