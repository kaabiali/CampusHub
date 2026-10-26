// Serves the plan visualization and persists decisions to visuals/<slug>-decisions.json.
// Artifact resolution: env SLUG, else newest *.html in visuals/ by mtime (not filename sort).
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const PORT = Number(process.env.PORT) || 5176;
const ROOT = join(process.cwd(), 'visuals');
const SLUG_FALLBACK = 'plan-campushub-mern-1';

async function resolveArtifact() {
  const pick = (slug) => ({ html: join(ROOT, `${slug}.html`), json: join(ROOT, `${slug}-decisions.json`) });
  if (process.env.SLUG) return pick(process.env.SLUG);
  try {
    const files = (await readdir(ROOT)).filter((f) => f.endsWith('.html'));
    const withMtime = await Promise.all(files.map(async (f) => ({ f, mtime: (await stat(join(ROOT, f))).mtimeMs })));
    withMtime.sort((a, b) => b.mtime - a.mtime);
    if (withMtime[0]) return pick(withMtime[0].f.replace(/\.html$/, ''));
  } catch {}
  return pick(SLUG_FALLBACK);
}

let ARTIFACT;

async function handle(req, res) {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(await readFile(ARTIFACT.html, 'utf8'));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/decisions') {
    let body = '{}';
    try { body = await readFile(ARTIFACT.json, 'utf8'); } catch {}
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(body);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/decisions') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    parsed._savedAt = new Date().toISOString();
    await mkdir(ROOT, { recursive: true });
    await writeFile(ARTIFACT.json, JSON.stringify(parsed, null, 2));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, savedAt: parsed._savedAt }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found');
}

const server = createServer((req, res) => {
  handle(req, res).catch((err) => {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(String(err));
  });
});

resolveArtifact().then((artifact) => {
  ARTIFACT = artifact;
  server.listen(PORT, () => {
    console.log(`\n  Plan editor  ->  http://localhost:${PORT}/`);
    console.log(`  HTML         ->  ${ARTIFACT.html}`);
    console.log(`  Decisions    ->  ${ARTIFACT.json}`);
    console.log('  (Ctrl-C to stop)\n');
  });
});
