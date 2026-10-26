import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { hashPassword } from '../src/lib/passwords.js';
import { signToken } from '../src/lib/auth.js';

export const app = createApp();

let seq = 0;

export async function createUser(overrides = {}) {
  seq += 1;
  const { motDePasse = 'motdepasse1', ...rest } = overrides;
  return User.create({
    prenom: 'Test',
    nom: `Etudiant${seq}`,
    email: `etudiant${seq}@campus.tn`,
    emailVerifie: true,
    motDePasseHache: await hashPassword(motDePasse),
    ...rest,
  });
}

export function as(user) {
  const token = signToken(user);
  const wrap = (method) => (url) => request(app)[method](url).set('Authorization', `Bearer ${token}`);
  return { get: wrap('get'), post: wrap('post'), patch: wrap('patch'), put: wrap('put'), delete: wrap('delete') };
}

export const tokenFromLink = (lien) => new URL(lien).searchParams.get('jeton');
