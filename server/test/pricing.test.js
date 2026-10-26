import { describe, it, expect, afterEach } from 'vitest';
import { createServer } from 'node:http';
import { config } from '../src/config.js';
import { mlStats, suggestPrice } from '../src/lib/pricing.js';

const input = { matiere: 'Probabilités', etat: 'TRES_BON', anneeEdition: 2021, prixNeuf: 45 };
const originalUrl = config.mlUrl;
let server;

function fakeMl(handler) {
  return new Promise((resolve) => {
    server = createServer(handler).listen(0, '127.0.0.1', () => {
      config.mlUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
}

afterEach(() => {
  config.mlUrl = originalUrl;
  server?.closeAllConnections();
  server?.close();
  server = undefined;
});

describe('suggestPrice', () => {
  it('utilise la fourchette du modèle quand le service répond', async () => {
    let received;
    await fakeMl((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        received = JSON.parse(body);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ min: 20, max: 23, modele: 'random_forest' }));
      });
    });
    expect(await suggestPrice(input)).toEqual({ min: 20, max: 23, source: 'ml' });
    expect(received.matiere).toBe('Probabilités');
  });

  it('bascule sur l’heuristique si le service renvoie une erreur', async () => {
    await fakeMl((req, res) => res.writeHead(500).end());
    const before = mlStats.fallbackCount;
    const r = await suggestPrice(input);
    expect(r.source).toBe('fallback');
    expect(r.min).toBeLessThanOrEqual(r.max);
    expect(mlStats.fallbackCount).toBe(before + 1);
  });

  it('ne bloque pas plus de 1,5 s si le service est lent', async () => {
    await fakeMl(() => {});
    const start = Date.now();
    const r = await suggestPrice(input);
    expect(r.source).toBe('fallback');
    expect(Date.now() - start).toBeLessThan(2000);
  });
});
