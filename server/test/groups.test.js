import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, as, createUser } from './helpers.js';
import { Group } from '../src/models/Group.js';

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
