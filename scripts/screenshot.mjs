// Usage: node scripts/screenshot.mjs <outDir> <path>[@mobile][@dark] ... [--login email:password]
// Drives the locally installed Edge, so no Playwright browser download is needed.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const args = process.argv.slice(2);
const outDir = args.shift();
const loginIdx = args.indexOf('--login');
const login = loginIdx >= 0 ? args.splice(loginIdx, 2)[1] : null;
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge' });

for (const spec of args) {
  const [path, ...flags] = spec.split('@');
  const mobile = flags.includes('mobile');
  const dark = flags.includes('dark');
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 860 },
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
    colorScheme: dark ? 'dark' : 'light',
    locale: 'fr-FR',
    timezoneId: 'Africa/Tunis',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  if (login) {
    const [email, password] = login.split(':');
    const res = await page.request.post(`${BASE}/api/auth/connexion`, { data: { email, motDePasse: password } });
    if (!res.ok()) throw new Error(`login failed: ${res.status()}`);
  }
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const name = `${path.replace(/[/?=&]+/g, '_').replace(/^_|_$/g, '') || 'home'}${mobile ? '-mobile' : ''}${dark ? '-dark' : ''}.png`;
  await page.screenshot({ path: join(outDir, name), fullPage: true });
  console.log(`${name}  overflowX=${overflow}px${errors.length ? `  ERRORS: ${errors.join(' | ')}` : ''}`);
  await context.close();
}

await browser.close();
