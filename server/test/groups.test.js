import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, as, createUser } from './helpers.js';
import { Group } from '../src/models/Group.js';
import { GroupMessage } from '../src/models/GroupMessage.js';

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const inHours = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();

const createGroup = (user, overrides = {}) =>
  as(user)
    .post('/api/groupes')
    .send({ nom: 'Probabilités, révision du partiel', matiere: 'Probabilités', description: 'Séances chaque jeudi', ...overrides });

describe('création et adhésion', () => {
  it('fait du créateur le premier membre', async () => {
    const owner = await createUser();
    const res = await createGroup(owner);
    expect(res.status).toBe(201);
    expect(res.body.groupe).toMatchObject({ nbMembres: 1, estMembre: true });
    const g = await Group.findById(res.body.groupe._id);
    expect(g.membres[0].role).toBe('CREATEUR');
  });

  it('ne dépasse jamais la capacité, même avec des demandes simultanées', async () => {
    const owner = await createUser();
    const { _id } = (await createGroup(owner, { capaciteMax: 3 })).body.groupe;
    const students = await Promise.all(Array.from({ length: 5 }, () => createUser()));
    const results = await Promise.all(students.map((s) => as(s).post(`/api/groupes/${_id}/membres`)));
    expect(results.filter((r) => r.status === 201)).toHaveLength(2);
    expect(results.filter((r) => r.status === 409).every((r) => r.body.error.code === 'GROUPE_COMPLET')).toBe(true);
    expect((await Group.findById(_id)).membres).toHaveLength(3);
  });

  it('refuse une double adhésion', async () => {
    const owner = await createUser();
    const s = await createUser();
    const { _id } = (await createGroup(owner)).body.groupe;
    expect((await as(s).post(`/api/groupes/${_id}/membres`)).status).toBe(201);
    expect((await as(s).post(`/api/groupes/${_id}/membres`)).body.error.code).toBe('DEJA_MEMBRE');
  });

  it('gère départ, exclusion et capacité', async () => {
    const owner = await createUser();
    const [a, b] = [await createUser(), await createUser()];
    const { _id } = (await createGroup(owner)).body.groupe;
    await as(a).post(`/api/groupes/${_id}/membres`);
    await as(b).post(`/api/groupes/${_id}/membres`);

    expect((await as(a).delete(`/api/groupes/${_id}/membres/${b._id}`)).status).toBe(403);
    expect((await as(owner).delete(`/api/groupes/${_id}/membres/${owner._id}`)).body.error.code).toBe('CREATEUR_NE_PART_PAS');
    expect((await as(a).delete(`/api/groupes/${_id}/membres/${a._id}`)).status).toBe(204);
    expect((await as(owner).delete(`/api/groupes/${_id}/membres/${b._id}`)).status).toBe(204);

    await as(a).post(`/api/groupes/${_id}/membres`);
    expect((await as(owner).patch(`/api/groupes/${_id}`).send({ capaciteMax: 1 })).status).toBe(400);
    expect((await as(owner).patch(`/api/groupes/${_id}`).send({ capaciteMax: 2 })).body.groupe.capaciteMax).toBe(2);
  });
});

describe('séances', () => {
  it('réserve la planification aux membres et la suppression à l’auteur ou au créateur', async () => {
    const owner = await createUser();
    const [member, outsider] = [await createUser(), await createUser()];
    const { _id } = (await createGroup(owner)).body.groupe;
    await as(member).post(`/api/groupes/${_id}/membres`);
    const seance = { date: inHours(48), lieu: 'Bibliothèque, salle 2', sujet: 'Lois discrètes' };

    expect((await as(outsider).post(`/api/groupes/${_id}/seances`).send(seance)).body.error.code).toBe('PAS_MEMBRE');
    expect((await as(member).post(`/api/groupes/${_id}/seances`).send({ ...seance, date: inHours(-2) })).status).toBe(400);
    const created = (await as(member).post(`/api/groupes/${_id}/seances`).send(seance)).body.seance;
    expect(created.duree).toBe(90);

    const other = (await as(owner).post(`/api/groupes/${_id}/seances`).send({ ...seance, sujet: 'Lois continues' })).body.seance;
    expect((await as(member).delete(`/api/groupes/${_id}/seances/${other._id}`)).status).toBe(403);
    expect((await as(owner).delete(`/api/groupes/${_id}/seances/${created._id}`)).status).toBe(204);

    const detail = await as(outsider).get(`/api/groupes/${_id}`);
    expect(detail.body.groupe.seances.map((s) => s.sujet)).toEqual(['Lois continues']);
    expect(detail.body.groupe.prochaineSeance.sujet).toBe('Lois continues');
  });
});

describe('documents', () => {
  it('ne partage les PDF qu’avec les membres', async () => {
    const owner = await createUser();
    const outsider = await createUser();
    const { _id } = (await createGroup(owner)).body.groupe;

    const bad = await as(owner).post(`/api/groupes/${_id}/documents`).attach('fichier', Buffer.from('hello'), { filename: 'notes.txt', contentType: 'text/plain' });
    expect(bad.status).toBe(415);

    const up = await as(owner)
      .post(`/api/groupes/${_id}/documents`)
      .attach('fichier', PDF, { filename: 'Résumé chapitre 3.pdf', contentType: 'application/pdf' });
    expect(up.status).toBe(201);
    const doc = up.body.document;
    expect(doc.nomFichier).toBe('Résumé chapitre 3.pdf');

    expect((await as(outsider).post(`/api/groupes/${_id}/documents`).attach('fichier', PDF, { filename: 'x.pdf', contentType: 'application/pdf' })).status).toBe(403);
    const asOutsider = (await as(outsider).get(`/api/groupes/${_id}`)).body.groupe;
    expect(asOutsider.documents).toEqual([]);
    expect(asOutsider.nbDocuments).toBe(1);

    expect((await as(outsider).get(`/api/groupes/${_id}/documents/${doc._id}`)).status).toBe(403);
    expect((await request(app).get(doc.url)).status).toBe(404);

    const dl = await as(owner).get(`/api/groupes/${_id}/documents/${doc._id}`);
    expect(dl.status).toBe(200);
    expect(dl.headers['content-disposition']).toMatch(/attachment/);
    expect(dl.headers['content-disposition']).toMatch(/R%C3%A9sum%C3%A9/);

    expect((await as(owner).delete(`/api/groupes/${_id}/documents/${doc._id}`)).status).toBe(204);
  });
});

describe('messagerie de groupe', () => {
  it('réserve la discussion aux membres et dédoublonne les renvois', async () => {
    const owner = await createUser();
    const [member, outsider] = [await createUser(), await createUser()];
    const { _id } = (await createGroup(owner)).body.groupe;
    await as(member).post(`/api/groupes/${_id}/membres`);

    expect((await as(outsider).get(`/api/groupes/${_id}/messages`)).body.error.code).toBe('PAS_MEMBRE');
    expect((await as(outsider).post(`/api/groupes/${_id}/messages`).send({ contenu: 'Bonjour', clientId: 'x' })).status).toBe(403);

    const first = await as(member).post(`/api/groupes/${_id}/messages`).send({ contenu: '  Bonjour tout le monde  ', clientId: 'client-1' });
    expect(first.status).toBe(201);
    expect(first.body.message).toMatchObject({ contenu: 'Bonjour tout le monde', clientId: 'client-1' });
    expect(first.body.message.auteur._id).toBe(String(member._id));

    const again = await as(member).post(`/api/groupes/${_id}/messages`).send({ contenu: 'Bonjour tout le monde', clientId: 'client-1' });
    expect(again.status).toBe(200);
    expect(again.body.duplicate).toBe(true);
    expect(await GroupMessage.countDocuments({ groupe: _id })).toBe(1);

    expect((await as(owner).get(`/api/groupes/${_id}/messages`)).body.messages.map((m) => m.contenu)).toEqual(['Bonjour tout le monde']);
  });

  it('pagine les messages et les isole par groupe', async () => {
    const owner = await createUser();
    const { _id } = (await createGroup(owner)).body.groupe;
    const other = (await createGroup(owner, { nom: 'Autre groupe de révision', matiere: 'Maths' })).body.groupe;

    const created = [];
    for (let i = 0; i < 3; i++) {
      created.push((await as(owner).post(`/api/groupes/${_id}/messages`).send({ contenu: `Message ${i}`, clientId: `c${i}` })).body.message);
    }
    await as(owner).post(`/api/groupes/${other._id}/messages`).send({ contenu: 'Ailleurs', clientId: 'other' });
    for (let i = 0; i < 3; i++) {
      await GroupMessage.updateOne({ _id: created[i]._id }, { $set: { dateEnvoi: new Date(Date.UTC(2026, 0, 1, 10, i)) } });
    }

    const page = await as(owner).get(`/api/groupes/${_id}/messages?limit=2`);
    expect(page.body.messages.map((m) => m.contenu)).toEqual(['Message 1', 'Message 2']);
    expect(page.body.plusAnciens).toBe(true);

    const older = await as(owner).get(`/api/groupes/${_id}/messages?limit=2&avant=${encodeURIComponent(page.body.messages[0].dateEnvoi)}`);
    expect(older.body.messages.map((m) => m.contenu)).toEqual(['Message 0']);
    expect(older.body.plusAnciens).toBe(false);
    expect((await as(owner).get(`/api/groupes/${other._id}/messages`)).body.messages.map((m) => m.contenu)).toEqual(['Ailleurs']);
  });
});

describe('réunions', () => {
  it('ouvre une salle réservée aux membres et la partage avec eux', async () => {
    const owner = await createUser();
    const [member, outsider] = [await createUser(), await createUser()];
    const { _id } = (await createGroup(owner)).body.groupe;
    await as(member).post(`/api/groupes/${_id}/membres`);

    expect((await as(outsider).post(`/api/groupes/${_id}/reunion`)).body.error.code).toBe('PAS_MEMBRE');
    expect((await as(outsider).get(`/api/groupes/${_id}`)).body.groupe.reunion).toBeNull();

    const created = await as(member).post(`/api/groupes/${_id}/reunion`).send({ sujet: 'Révision du partiel' });
    expect(created.status).toBe(201);
    expect(created.body.reunion).toMatchObject({ sujet: 'Révision du partiel' });
    expect(created.body.reunion.url).toMatch(/^https:\/\/meet\.jit\.si\/CampusHub-/);
    expect(created.body.reunion.demarrePar._id).toBe(String(member._id));

    const detail = await as(owner).get(`/api/groupes/${_id}`);
    expect(detail.body.groupe.reunion.sujet).toBe('Révision du partiel');
    expect((await as(outsider).get(`/api/groupes/${_id}`)).body.groupe.reunion).toBeNull();

    // Opening again joins the existing room instead of creating a second one.
    const again = await as(owner).post(`/api/groupes/${_id}/reunion`).send({ sujet: 'Autre' });
    expect(again.status).toBe(200);
    expect(again.body.reunion.url).toBe(created.body.reunion.url);

    expect((await as(owner).delete(`/api/groupes/${_id}/reunion`)).status).toBe(204);
    expect((await as(owner).get(`/api/groupes/${_id}`)).body.groupe.reunion).toBeNull();
  });

  it('réserve la fermeture à l’organisateur ou au créateur du groupe', async () => {
    const owner = await createUser();
    const [starter, member] = [await createUser(), await createUser()];
    const { _id } = (await createGroup(owner)).body.groupe;
    await as(starter).post(`/api/groupes/${_id}/membres`);
    await as(member).post(`/api/groupes/${_id}/membres`);
    await as(starter).post(`/api/groupes/${_id}/reunion`).send({});

    expect((await as(member).delete(`/api/groupes/${_id}/reunion`)).body.error.code).toBe('PAS_AUTEUR');
    expect((await as(starter).delete(`/api/groupes/${_id}/reunion`)).status).toBe(204);
    expect((await as(starter).delete(`/api/groupes/${_id}/reunion`)).status).toBe(404);
  });
});

describe('recherche', () => {
  it('trouve les groupes sans accents et indique l’appartenance', async () => {
    const owner = await createUser();
    const viewer = await createUser();
    await createGroup(owner);
    await createGroup(owner, { nom: 'Python et Pandas', matiere: 'Programmation' });
    const res = await as(viewer).get('/api/groupes?q=probabilites revision');
    expect(res.body.groupes.map((g) => g.nom)).toEqual(['Probabilités, révision du partiel']);
    expect(res.body.groupes[0].estMembre).toBe(false);
    expect((await as(owner).get('/api/groupes/mes-groupes')).body.groupes).toHaveLength(2);
  });
});
