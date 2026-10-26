import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, as, createUser, tokenFromLink } from './helpers.js';
import { testOutbox } from '../src/lib/mailer.js';
import { User } from '../src/models/User.js';

const signup = (overrides = {}) =>
  request(app)
    .post('/api/auth/inscription')
    .send({ prenom: 'Yasmine', nom: 'Ben Salah', email: 'yasmine.bensalah@campus.tn', motDePasse: 'motdepasse1', filiere: 'Data Science', niveau: '1ère année', ...overrides });

const cookieOf = (res) => res.headers['set-cookie']?.find((c) => c.startsWith('campushub_token='))?.split(';')[0];

describe('inscription', () => {
  it('refuse une adresse hors campus', async () => {
    const res = await signup({ email: 'yasmine@gmail.com' });
    expect(res.status).toBe(400);
    expect(res.body.error.champs.email).toMatch(/@campus\.tn/);
  });

  it('refuse un mot de passe sans chiffre', async () => {
    const res = await signup({ motDePasse: 'motdepasse' });
    expect(res.status).toBe(400);
    expect(res.body.error.champs.motDePasse).toBeDefined();
  });

  it('crée un compte non vérifié, pose le cookie et envoie le lien', async () => {
    const res = await signup();
    expect(res.status).toBe(201);
    expect(res.body.utilisateur.emailVerifie).toBe(false);
    expect(res.body.utilisateur.motDePasseHache).toBeUndefined();
    expect(cookieOf(res)).toBeTruthy();
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
    expect(testOutbox).toHaveLength(1);
    expect(testOutbox[0].lien).toMatch(/\/verifier-email\?jeton=/);
  });

  it("normalise l'e-mail et refuse les doublons", async () => {
    await signup({ email: 'Yasmine.BenSalah@Campus.tn' });
    const res = await signup();
    expect(res.status).toBe(400);
    expect(res.body.error.champs.email).toMatch(/existe déjà/);
  });
});

describe('vérification e-mail', () => {
  it('bloque les actions tant que l’e-mail n’est pas confirmé, puis les autorise', async () => {
    const res = await signup();
    const cookie = cookieOf(res);

    const moi = await request(app).get('/api/auth/moi').set('Cookie', cookie);
    expect(moi.status).toBe(200);

    const blocked = await request(app).patch('/api/utilisateurs/moi').set('Cookie', cookie).send({ niveau: '2e année' });
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('EMAIL_NON_VERIFIE');

    const verified = await request(app).post('/api/auth/verifier').send({ jeton: tokenFromLink(testOutbox[0].lien) });
    expect(verified.status).toBe(200);
    expect(verified.body.utilisateur.emailVerifie).toBe(true);

    const allowed = await request(app).patch('/api/utilisateurs/moi').set('Cookie', cookie).send({ niveau: '2e année' });
    expect(allowed.status).toBe(200);
  });

  it('refuse un jeton déjà utilisé ou expiré', async () => {
    await signup();
    const jeton = tokenFromLink(testOutbox[0].lien);
    expect((await request(app).post('/api/auth/verifier').send({ jeton })).status).toBe(200);
    expect((await request(app).post('/api/auth/verifier').send({ jeton })).body.error.code).toBe('JETON_INVALIDE');

    await signup({ email: 'autre@campus.tn' });
    await User.updateOne({ email: 'autre@campus.tn' }, { 'jetonVerification.expire': new Date(Date.now() - 1000) });
    const expired = await request(app).post('/api/auth/verifier').send({ jeton: tokenFromLink(testOutbox[1].lien) });
    expect(expired.body.error.code).toBe('JETON_INVALIDE');
  });
});

describe('connexion', () => {
  it('donne le même message pour un e-mail inconnu et un mauvais mot de passe', async () => {
    const user = await createUser();
    const wrongPass = await request(app).post('/api/auth/connexion').send({ email: user.email, motDePasse: 'mauvais123' });
    const unknown = await request(app).post('/api/auth/connexion').send({ email: 'inconnu@campus.tn', motDePasse: 'mauvais123' });
    expect(wrongPass.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrongPass.body).toEqual(unknown.body);
  });

  it('refuse un compte bloqué, à la connexion comme avec un jeton existant', async () => {
    const user = await createUser({ estBloque: true });
    const login = await request(app).post('/api/auth/connexion').send({ email: user.email, motDePasse: 'motdepasse1' });
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('COMPTE_BLOQUE');
    expect((await as(user).get('/api/auth/moi')).status).toBe(403);
  });

  it('refuse les requêtes sans jeton', async () => {
    expect((await request(app).get('/api/auth/moi')).status).toBe(401);
  });
});

describe('mot de passe', () => {
  it('ne révèle pas si un compte existe', async () => {
    const res = await request(app).post('/api/auth/mot-de-passe-oublie').send({ email: 'personne@campus.tn' });
    expect(res.status).toBe(200);
    expect(testOutbox).toHaveLength(0);
  });

  it('réinitialise, invalide les anciennes sessions et permet la connexion', async () => {
    const user = await createUser();
    const oldSession = as(user);
    await request(app).post('/api/auth/mot-de-passe-oublie').send({ email: user.email });
    const jeton = tokenFromLink(testOutbox[0].lien);

    const reset = await request(app).post('/api/auth/reinitialiser').send({ jeton, motDePasse: 'nouveau123' });
    expect(reset.status).toBe(200);
    expect((await oldSession.get('/api/auth/moi')).status).toBe(401);

    const login = await request(app).post('/api/auth/connexion').send({ email: user.email, motDePasse: 'nouveau123' });
    expect(login.status).toBe(200);
  });

  it('change le mot de passe avec vérification de l’actuel', async () => {
    const user = await createUser();
    const wrong = await as(user).patch('/api/utilisateurs/moi/mot-de-passe').send({ actuel: 'faux12345', nouveau: 'nouveau123' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.champs.actuel).toBeDefined();

    const ok = await as(user).patch('/api/utilisateurs/moi/mot-de-passe').send({ actuel: 'motdepasse1', nouveau: 'nouveau123' });
    expect(ok.status).toBe(200);
    expect((await as(user).get('/api/auth/moi')).status).toBe(401);
  });
});

describe('profil', () => {
  it('met à jour matières et centres d’intérêt en dédoublonnant', async () => {
    const user = await createUser();
    const res = await as(user).patch('/api/utilisateurs/moi').send({ matieres: ['Probabilités', ' Probabilités ', 'Python'], centresInteret: ['IA'] });
    expect(res.status).toBe(200);
    expect(res.body.utilisateur.matieres).toEqual(['Probabilités', 'Python']);
  });

  it('refuse une photo qui n’est pas une image', async () => {
    const user = await createUser();
    const res = await as(user).post('/api/utilisateurs/moi/photo').attach('photo', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(res.status).toBe(415);
  });

  it('accepte une photo PNG et expose son URL', async () => {
    const user = await createUser();
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4a00000000049454e44ae426082', 'hex');
    const res = await as(user).post('/api/utilisateurs/moi/photo').attach('photo', png, { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    expect(res.body.utilisateur.photoUrl).toMatch(/^\/uploads\/avatars\/[a-f0-9]{32}\.png$/);
    expect((await request(app).get(res.body.utilisateur.photoUrl)).status).toBe(200);
  });

  it("n'expose pas l'e-mail dans le profil public", async () => {
    const [a, b] = [await createUser(), await createUser()];
    const res = await as(a).get(`/api/utilisateurs/${b._id}`);
    expect(res.status).toBe(200);
    expect(res.body.utilisateur.email).toBeUndefined();
    expect((await as(a).get('/api/utilisateurs/pas-un-id')).status).toBe(400);
  });
});
