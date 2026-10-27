import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import { app, as, createUser } from './helpers.js';

afterEach(() => vi.unstubAllGlobals());

describe('géocodage', () => {
  it('exige une session', async () => {
    expect((await request(app).get('/api/geo/search?q=La+Marsa')).status).toBe(401);
    expect((await request(app).get('/api/geo/reverse?lat=36.8&lng=10.1')).status).toBe(401);
  });

  it('valide la recherche avant tout appel externe', async () => {
    const user = await createUser();
    const short = await as(user).get('/api/geo/search?q=La');
    expect(short.status).toBe(400);
    expect(short.body.error.champs.q).toMatch(/3 caractères/);
    expect((await as(user).get('/api/geo/search')).status).toBe(400);
  });

  it('valide les coordonnées du géocodage inverse', async () => {
    const user = await createUser();
    const outOfRange = await as(user).get('/api/geo/reverse?lat=120&lng=10');
    expect(outOfRange.status).toBe(400);
    expect(outOfRange.body.error.champs.lat).toBeDefined();

    const missing = await as(user).get('/api/geo/reverse');
    expect(missing.status).toBe(400);
    expect(missing.body.error.champs.lat).toBeDefined();
    expect(missing.body.error.champs.lng).toBeDefined();
  });
});

describe('itinéraire', () => {
  const url = (q) => `/api/geo/itineraire?${new URLSearchParams(q)}`;

  it('exige une session', async () => {
    expect((await request(app).get(url({ departLat: 36.8, departLng: 10.1, arriveeLat: 36.9, arriveeLng: 10.2 }))).status).toBe(401);
  });

  it('refuse des coordonnées incomplètes', async () => {
    const user = await createUser();
    const res = await as(user).get(url({ departLat: 36.8, departLng: 10.1 }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PARAMETRES_INVALIDES');
  });

  it('refuse une requête sans départ ni arrivée', async () => {
    const user = await createUser();
    const res = await as(user).get(url({}));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PARAMETRES_INVALIDES');
  });

  it('renvoie la durée et la distance du moteur d’itinéraire', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ routes: [{ distance: 11200, duration: 720 }] }) })));
    const user = await createUser();
    const res = await as(user).get(url({ departLat: 36.8065, departLng: 10.1815, arriveeLat: 36.85, arriveeLng: 10.25 }));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ dureeMinutes: 12, distanceKm: 11.2, source: 'route' });
    expect(fetch).toHaveBeenCalledOnce();
    expect(String(fetch.mock.calls[0][0])).toContain('/route/v1/driving/10.1815,36.8065;10.25,36.85');
  });

  it('borne la durée entre 5 et 240 minutes', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ routes: [{ distance: 400, duration: 60 }] }) })));
    const user = await createUser();
    const res = await as(user).get(url({ departLat: 36.8075, departLng: 10.1825, arriveeLat: 36.8105, arriveeLng: 10.1855 }));
    expect(res.body.dureeMinutes).toBe(5);
  });

  it('estime la durée quand le moteur d’itinéraire est indisponible', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down');
    }));
    const user = await createUser();
    const res = await as(user).get(url({ departLat: 36.8, departLng: 10.1, arriveeLat: 36.95, arriveeLng: 10.3 }));

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('estimation');
    expect(res.body.dureeMinutes).toBeGreaterThanOrEqual(5);
    expect(res.body.dureeMinutes).toBeLessThanOrEqual(240);
    expect(res.body.distanceKm).toBeGreaterThan(10);
  });
});
