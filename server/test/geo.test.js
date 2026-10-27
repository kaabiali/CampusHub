import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, as, createUser } from './helpers.js';

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
