import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'node:http';
import { io as connect } from 'socket.io-client';
import { app, as, createUser } from './helpers.js';
import { Message } from '../src/models/Message.js';
import { Notification } from '../src/models/Notification.js';
import { Category } from '../src/models/Category.js';
import { attachRealtime } from '../src/lib/realtime.js';
import { signToken } from '../src/lib/auth.js';
import { handleSocket } from '../src/routes/messages.js';

let server;
let url;
const sockets = [];

beforeAll(async () => {
  server = createServer(app);
  attachRealtime(server, { onConnection: handleSocket });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  url = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  sockets.forEach((s) => s.close());
  await new Promise((r) => server.close(r));
});

function socketFor(user) {
  const s = connect(url, { auth: { token: signToken(user) }, transports: ['websocket'], reconnection: false });
  sockets.push(s);
  return new Promise((resolve, reject) => {
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
}

const nextEvent = (socket, event, ms = 2000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), ms);
    socket.once(event, (payload) => {
      clearTimeout(t);
      resolve(payload);
    });
  });

let seq = 0;
const send = (from, to, contenu, extra = {}) => as(from).post(`/api/conversations/${to._id}/messages`).send({ contenu, clientId: `c-${++seq}`, ...extra });

describe('messages (REST)', () => {
  it('envoie, liste les conversations et compte les non-lus', async () => {
    const [a, b] = [await createUser({ prenom: 'Rania' }), await createUser()];
    expect((await send(a, b, 'Bonjour, le livre est toujours disponible ?')).status).toBe(201);
    await send(a, b, 'Je peux passer demain.');

    const forB = (await as(b).get('/api/conversations')).body.conversations;
    expect(forB).toHaveLength(1);
    expect(forB[0]).toMatchObject({ nonLus: 2, dernier: { contenu: 'Je peux passer demain.' } });
    expect(forB[0].avec.email).toBeUndefined();
    expect((await as(a).get('/api/conversations')).body.conversations[0].nonLus).toBe(0);

    expect((await send(a, a, 'moi')).body.error.code).toBe('DESTINATAIRE_INVALIDE');
    expect((await send(a, b, '   ')).status).toBe(400);
  });

  it('ne duplique pas un message renvoyé avec le même clientId', async () => {
    const [a, b] = [await createUser(), await createUser()];
    const body = { contenu: 'Un seul', clientId: 'fixe-1' };
    const [r1, r2] = await Promise.all([as(a).post(`/api/conversations/${b._id}/messages`).send(body), as(a).post(`/api/conversations/${b._id}/messages`).send(body)]);
    expect([r1.status, r2.status].sort()).toEqual([200, 201]);
    expect(r1.body.message._id).toBe(r2.body.message._id);
    expect(await Message.countDocuments({ expediteur: a._id })).toBe(1);
  });

  it('résout le contexte d’une annonce', async () => {
    const [seller, buyer] = [await createUser(), await createUser()];
    const cat = await Category.create({ nom: `Maths ${Math.random()}` });
    const { annonce } = (await as(seller).post('/api/annonces').send({ titre: 'Analyse 1, cours', categorie: String(cat._id), matiere: 'Analyse 1', etat: 'BON', prix: 18 })).body;
    const res = await send(buyer, seller, 'Toujours dispo ?', { contexte: { type: 'ANNONCE', ref: annonce._id } });
    expect(res.body.message.contexte).toMatchObject({ type: 'ANNONCE', libelle: 'Analyse 1, cours' });
  });

  it('regroupe les notifications par conversation et les efface à la lecture', async () => {
    const [a, b] = [await createUser({ prenom: 'Amine', nom: 'Trabelsi' }), await createUser()];
    for (const t of ['un', 'deux', 'trois']) await send(a, b, t);
    const notifs = await Notification.find({ utilisateur: b._id, type: 'MESSAGE' });
    expect(notifs).toHaveLength(1);
    expect(notifs[0]).toMatchObject({ lue: false, contenu: 'Amine Trabelsi : trois', lien: `/messages/${a._id}` });

    expect((await as(b).post(`/api/conversations/${a._id}/lu`)).body.marques).toBe(3);
    expect(await Message.countDocuments({ destinataire: b._id, lu: false })).toBe(0);
    expect((await Notification.findById(notifs[0]._id)).lue).toBe(true);

    await send(a, b, 'quatre');
    expect(await Notification.countDocuments({ utilisateur: b._id, type: 'MESSAGE' })).toBe(2);
    expect((await as(b).get('/api/notifications')).body.nonLues).toBe(1);
    await as(b).post('/api/notifications/lues').send({});
    expect((await as(b).get('/api/notifications')).body.nonLues).toBe(0);
  });

  it('pagine l’historique et isole chaque conversation', async () => {
    const [a, b, c] = [await createUser(), await createUser(), await createUser()];
    for (let i = 1; i <= 5; i++) await send(a, b, `m${i}`);
    const page1 = (await as(b).get(`/api/conversations/${a._id}/messages?limit=3`)).body;
    expect(page1.messages.map((m) => m.contenu)).toEqual(['m3', 'm4', 'm5']);
    expect(page1.plusAnciens).toBe(true);
    const page2 = (await as(b).get(`/api/conversations/${a._id}/messages?limit=3&avant=${page1.messages[0].dateEnvoi}`)).body;
    expect(page2.messages.map((m) => m.contenu)).toEqual(['m1', 'm2']);
    expect((await as(c).get(`/api/conversations/${a._id}/messages`)).body.messages).toEqual([]);
  });

  it('refuse d’écrire à un compte bloqué', async () => {
    const [a, b] = [await createUser(), await createUser({ estBloque: true })];
    expect((await send(a, b, 'hello')).body.error.code).toBe('DESTINATAIRE_BLOQUE');
  });
});

describe('temps réel (Socket.io)', () => {
  it('refuse une connexion sans jeton valide', async () => {
    const s = connect(url, { auth: { token: 'faux' }, transports: ['websocket'], reconnection: false });
    sockets.push(s);
    await expect(new Promise((resolve, reject) => {
      s.on('connect', resolve);
      s.on('connect_error', (e) => reject(e));
    })).rejects.toThrow('NON_AUTHENTIFIE');
  });

  it('livre le message en direct avec accusé et notification', async () => {
    const [a, b] = [await createUser({ prenom: 'Rania', nom: 'Jaziri' }), await createUser()];
    const [sa, sb] = [await socketFor(a), await socketFor(b)];
    const received = nextEvent(sb, 'message:new');
    const notified = nextEvent(sb, 'notification:new');
    const ack = await sa.emitWithAck('message:send', { destinataire: String(b._id), contenu: 'On se voit à 12:30 ?', clientId: 'ws-1' });
    expect(ack.ok).toBe(true);
    expect((await received).contenu).toBe('On se voit à 12:30 ?');
    expect((await notified).contenu).toMatch(/Rania Jaziri/);

    const again = await sa.emitWithAck('message:send', { destinataire: String(b._id), contenu: 'On se voit à 12:30 ?', clientId: 'ws-1' });
    expect(again.message._id).toBe(ack.message._id);
    expect(await Message.countDocuments({ expediteur: a._id })).toBe(1);

    const bad = await sa.emitWithAck('message:send', { destinataire: String(a._id), contenu: 'moi', clientId: 'ws-2' });
    expect(bad).toMatchObject({ ok: false, error: { code: 'DESTINATAIRE_INVALIDE' } });
  });

  it('relaie la saisie et les accusés de lecture', async () => {
    const [a, b] = [await createUser(), await createUser()];
    const [sa, sb] = [await socketFor(a), await socketFor(b)];
    const typing = nextEvent(sb, 'typing');
    sa.emit('typing', { destinataire: String(b._id), actif: true });
    expect(await typing).toEqual({ de: String(a._id), actif: true });

    await send(a, b, 'lu ?');
    const receipt = nextEvent(sa, 'messages:lus');
    await as(b).post(`/api/conversations/${a._id}/lu`);
    expect(await receipt).toEqual({ par: String(b._id) });
  });
});
