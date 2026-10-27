import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app, createUser } from './helpers.js';
import { config } from '../src/config.js';
import { User } from '../src/models/User.js';

const { verifyIdToken } = vi.hoisted(() => ({ verifyIdToken: vi.fn() }));

vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    verifyIdToken(...args) {
      return verifyIdToken(...args);
    }
  },
}));

const postGoogle = (credential = 'id-token') => request(app).post('/api/auth/google').send({ credential });
const tokenFor = (payload) => verifyIdToken.mockResolvedValue({ getPayload: () => payload });
const cookieOf = (res) => res.headers['set-cookie']?.find((c) => c.startsWith('campushub_token='))?.split(';')[0];

const payload = {
  sub: 'google-sub-1',
  email: 'google.etudiant@campus.tn',
  email_verified: true,
  given_name: 'Google',
  family_name: 'Étudiant',
};

beforeEach(() => {
  config.googleClientId = 'test-client.apps.googleusercontent.com';
  verifyIdToken.mockReset();
});

afterEach(() => {
  config.googleClientId = '';
});

describe('connexion Google', () => {
  it('renvoie 503 quand Google n’est pas configuré', async () => {
    config.googleClientId = '';
    const res = await postGoogle();
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('GOOGLE_NON_CONFIGURE');
  });

  it('refuse un jeton Google invalide', async () => {
    verifyIdToken.mockRejectedValue(new Error('invalid token'));
    const res = await postGoogle();
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('JETON_GOOGLE_INVALIDE');
  });

  it('accepte un compte Google hors campus (Gmail)', async () => {
    tokenFor({ ...payload, email: 'etudiant@gmail.com' });
    const res = await postGoogle();
    expect(res.status).toBe(200);
    expect(res.body.utilisateur.email).toBe('etudiant@gmail.com');
    expect(await User.findOne({ email: 'etudiant@gmail.com' })).toMatchObject({ emailVerifie: true });
  });

  it('refuse une adresse non vérifiée par Google', async () => {
    tokenFor({ ...payload, email_verified: false });
    const res = await postGoogle();
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('EMAIL_GOOGLE_NON_VERIFIE');
  });

  it('crée un compte vérifié, stocke le sub Google et pose le cookie', async () => {
    tokenFor(payload);
    const res = await postGoogle();

    expect(res.status).toBe(200);
    expect(verifyIdToken).toHaveBeenCalledWith({ idToken: 'id-token', audience: 'test-client.apps.googleusercontent.com' });
    expect(res.body.utilisateur.email).toBe(payload.email);
    expect(res.body.utilisateur.emailVerifie).toBe(true);
    expect(res.body.utilisateur.googleId).toBeUndefined();
    expect(cookieOf(res)).toBeTruthy();

    const user = await User.findOne({ email: payload.email });
    expect(user.googleId).toBe(payload.sub);
    expect(user.emailVerifie).toBe(true);
    expect(user.prenom).toBe('Google');
    expect(user.nom).toBe('Étudiant');
  });

  it('lie un compte existant et le marque vérifié', async () => {
    const existing = await createUser({ email: payload.email, emailVerifie: false });
    tokenFor(payload);

    const res = await postGoogle();
    expect(res.status).toBe(200);

    const user = await User.findById(existing._id);
    expect(user.googleId).toBe(payload.sub);
    expect(user.emailVerifie).toBe(true);
  });

  it('refuse un compte bloqué', async () => {
    await createUser({ email: payload.email, estBloque: true });
    tokenFor(payload);

    const res = await postGoogle();
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('COMPTE_BLOQUE');
  });
});
