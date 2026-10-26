import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, as, createUser } from './helpers.js';
import { Club } from '../src/models/Club.js';
import { Event, Registration } from '../src/models/Event.js';
import { Notification } from '../src/models/Notification.js';
import { testOutbox } from '../src/lib/mailer.js';
import { sendEventReminders } from '../src/jobs/reminders.js';

const inHours = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();

async function clubWithLeader() {
  const leader = await createUser({ prenom: 'Mariem', nom: 'Chaabane' });
  const club = await Club.create({ nom: `Club IEEE ${Math.random()}`, responsables: [leader._id] });
  return { leader, club };
}

const publish = (user, club, overrides = {}) =>
  as(user)
    .post('/api/evenements')
    .send({ club: String(club._id), titre: 'Hackathon Data For Good', lieu: 'Amphi B', dateDebut: inHours(72), capacite: 120, description: 'Équipes de 3 à 5', ...overrides });

async function invariant(eventId) {
  const event = await Event.findById(eventId);
  expect(event.nbInscrits).toBe(await Registration.countDocuments({ evenement: eventId }));
  return event;
}

describe('clubs', () => {
  it('réserve la gestion des clubs à l’administration', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const student = await createUser();
    expect((await as(student).post('/api/clubs').send({ nom: 'Club Sport' })).status).toBe(403);
    const { club } = (await as(admin).post('/api/clubs').send({ nom: 'Club Sport' })).body;
    const bad = await as(admin).put(`/api/clubs/${club._id}/responsables`).send({ emails: ['personne@campus.tn'] });
    expect(bad.body.error.champs.emails).toMatch(/personne@campus.tn/);
    const ok = await as(admin).put(`/api/clubs/${club._id}/responsables`).send({ emails: [student.email.toUpperCase()] });
    expect(ok.body.club.responsables.map((r) => r.email)).toEqual([student.email]);
    expect((await as(student).get('/api/clubs/mes-clubs')).body.clubs.map((c) => c.nom)).toEqual(['Club Sport']);
  });
});

describe('publication', () => {
  it('ne laisse publier que les responsables du club et l’administration', async () => {
    const { leader, club } = await clubWithLeader();
    const student = await createUser();
    const admin = await createUser({ role: 'ADMIN' });
    expect((await publish(student, club)).body.error.code).toBe('PAS_RESPONSABLE');
    expect((await publish(leader, club)).status).toBe(201);
    expect((await publish(admin, club)).status).toBe(201);
    expect((await publish(leader, club, { dateFin: inHours(70) })).body.error.champs.dateFin).toBeDefined();
  });

  it('interdit de réduire la capacité sous le nombre d’inscrits', async () => {
    const { leader, club } = await clubWithLeader();
    const { _id } = (await publish(leader, club, { capacite: 5 })).body.evenement;
    for (let i = 0; i < 3; i++) await as(await createUser()).post(`/api/evenements/${_id}/inscription`);
    expect((await as(leader).patch(`/api/evenements/${_id}`).send({ capacite: 2 })).body.error.champs.capacite).toMatch(/3 étudiants/);
    expect((await as(leader).patch(`/api/evenements/${_id}`).send({ capacite: 3 })).status).toBe(200);
  });
});

describe('inscriptions', () => {
  it('ne dépasse jamais la capacité : 6 demandes simultanées pour 2 places', async () => {
    const { leader, club } = await clubWithLeader();
    const { _id } = (await publish(leader, club, { capacite: 2 })).body.evenement;
    const students = await Promise.all(Array.from({ length: 6 }, () => createUser()));
    const results = await Promise.all(students.map((s) => as(s).post(`/api/evenements/${_id}/inscription`)));
    expect(results.filter((r) => r.status === 201)).toHaveLength(2);
    expect(results.filter((r) => r.status === 409).every((r) => r.body.error.code === 'EVENEMENT_COMPLET')).toBe(true);
    expect((await invariant(_id)).nbInscrits).toBe(2);
  });

  it('gère double inscription, désinscription et capacité illimitée', async () => {
    const { leader, club } = await clubWithLeader();
    const { _id } = (await publish(leader, club, { capacite: null })).body.evenement;
    const s = await createUser();
    expect((await as(s).post(`/api/evenements/${_id}/inscription`)).status).toBe(201);
    expect((await as(s).post(`/api/evenements/${_id}/inscription`)).body.error.code).toBe('DEJA_INSCRIT');
    await invariant(_id);
    expect((await as(s).delete(`/api/evenements/${_id}/inscription`)).body.evenement.nbInscrits).toBe(0);
    expect((await as(s).delete(`/api/evenements/${_id}/inscription`)).status).toBe(404);
    for (let i = 0; i < 4; i++) expect((await as(await createUser()).post(`/api/evenements/${_id}/inscription`)).status).toBe(201);
    await invariant(_id);
  });

  it('prévient les inscrits quand l’événement est annulé', async () => {
    const { leader, club } = await clubWithLeader();
    const { _id } = (await publish(leader, club)).body.evenement;
    const [a, b] = [await createUser(), await createUser()];
    await as(a).post(`/api/evenements/${_id}/inscription`);
    await as(b).post(`/api/evenements/${_id}/inscription`);
    expect((await as(a).post(`/api/evenements/${_id}/annuler`)).status).toBe(403);
    await as(leader).post(`/api/evenements/${_id}/annuler`);
    expect(await Notification.countDocuments({ contenu: /est annulé/ })).toBe(2);
    expect((await as(await createUser()).post(`/api/evenements/${_id}/inscription`)).body.error.code).toBe('EVENEMENT_ANNULE');
  });

  it('montre la liste des inscrits aux seuls responsables', async () => {
    const { leader, club } = await clubWithLeader();
    const { _id } = (await publish(leader, club)).body.evenement;
    const s = await createUser();
    await as(s).post(`/api/evenements/${_id}/inscription`);
    expect((await as(s).get(`/api/evenements/${_id}/inscrits`)).status).toBe(403);
    expect((await as(leader).get(`/api/evenements/${_id}/inscrits`)).body.inscrits.map((u) => u.email)).toEqual([s.email]);
  });
});

describe('rappels', () => {
  it('envoie un seul rappel par inscription, la veille seulement', async () => {
    const { leader, club } = await clubWithLeader();
    const soon = (await publish(leader, club, { dateDebut: inHours(20) })).body.evenement;
    const later = (await publish(leader, club, { dateDebut: inHours(40) })).body.evenement;
    const [a, b] = [await createUser(), await createUser()];
    for (const u of [a, b]) {
      await as(u).post(`/api/evenements/${soon._id}/inscription`);
      await as(u).post(`/api/evenements/${later._id}/inscription`);
    }
    testOutbox.length = 0;
    const [first, second] = await Promise.all([sendEventReminders(), sendEventReminders()]);
    expect(first + second).toBe(2);
    expect(await sendEventReminders()).toBe(0);
    expect(await Notification.countDocuments({ type: 'RAPPEL_EVENEMENT' })).toBe(2);
    expect(testOutbox.filter((m) => m.sujet.startsWith('Rappel'))).toHaveLength(2);
  });
});

describe('listes', () => {
  it('expose les événements publics à venir sans connexion', async () => {
    const { leader, club } = await clubWithLeader();
    await publish(leader, club, { titre: 'Atelier CV et LinkedIn' });
    await publish(leader, club, { titre: 'Réunion interne', estPublic: false });
    const res = await request(app).get('/api/evenements/publics');
    expect(res.status).toBe(200);
    expect(res.body.evenements.map((e) => e.titre)).toEqual(['Atelier CV et LinkedIn']);
    expect(res.body.evenements[0].club.nom).toMatch(/Club IEEE/);
    expect(res.body.evenements[0].organisateur).toBeUndefined();
  });

  it('filtre mes inscriptions et indique estInscrit', async () => {
    const { leader, club } = await clubWithLeader();
    const e1 = (await publish(leader, club, { titre: 'Soirée ciné-débat' })).body.evenement;
    await publish(leader, club, { titre: 'Tournoi de football' });
    const s = await createUser();
    await as(s).post(`/api/evenements/${e1._id}/inscription`);
    const mine = await as(s).get('/api/evenements?filtre=mes-inscriptions');
    expect(mine.body.evenements.map((e) => e.titre)).toEqual(['Soirée ciné-débat']);
    expect(mine.body.evenements[0].estInscrit).toBe(true);
    expect((await as(s).get('/api/evenements')).body.total).toBe(2);
  });
});
