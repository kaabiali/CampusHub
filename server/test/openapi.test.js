import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import { parse } from 'yaml';
import { app } from './helpers.js';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

// Routes declared in code, read from app.js mounts and each router file.
function declaredRoutes() {
  const appSrc = read('../src/app.js');
  const files = {};
  for (const [, names, file] of appSrc.matchAll(/import \{ ([^}]+) \} from '\.\/routes\/(\w+)\.js'/g)) {
    for (const n of names.split(',')) files[n.trim()] = file;
  }
  const routes = [];
  for (const [, mount, router] of appSrc.matchAll(/app\.use\('(\/api[^']*)', (\w+)\)/g)) {
    if (!files[router]) continue;
    const src = read(`../src/routes/${files[router]}.js`);
    for (const [, method, path] of src.matchAll(new RegExp(`${router}\\.(get|post|patch|put|delete)\\(\\s*'([^']*)'`, 'g'))) {
      const full = `${mount}${path === '/' ? '' : path}`.replace(/^\/api/, '').replace(/:(\w+)/g, '{$1}');
      routes.push(`${method.toUpperCase()} ${full}`);
    }
  }
  return routes.sort();
}

function documentedRoutes() {
  const spec = parse(read('../openapi.yaml'));
  return Object.entries(spec.paths)
    .flatMap(([path, ops]) => Object.keys(ops).filter((k) => k !== 'parameters').map((m) => `${m.toUpperCase()} ${path}`))
    .sort();
}

describe('documentation OpenAPI', () => {
  it('documente exactement les routes déclarées', () => {
    const declared = declaredRoutes();
    const documented = documentedRoutes();
    expect(declared.length).toBeGreaterThan(70);
    expect({ nonDocumentees: declared.filter((r) => !documented.includes(r)), enTrop: documented.filter((r) => !declared.includes(r)) }).toEqual({ nonDocumentees: [], enTrop: [] });
  });

  it('sert Swagger UI et la spécification', async () => {
    expect((await request(app).get('/api/openapi.json')).body.info.title).toBe('CampusHub API');
    const ui = await request(app).get('/api/docs/');
    expect(ui.status).toBe(200);
    expect(ui.text).toMatch(/swagger-ui/);
  });
});
