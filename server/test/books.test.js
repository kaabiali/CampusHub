import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { app, as, createUser } from './helpers.js';
import { Category } from '../src/models/Category.js';
import { Book } from '../src/models/Book.js';
import { Report } from '../src/models/Report.js';
import { uploadsRoot } from '../src/lib/upload.js';

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4a00000000049454e44ae426082', 'hex');

let maths;
let info;
beforeEach(async () => {
  [maths, info] = await Category.create([{ nom: 'Mathématiques' }, { nom: 'Informatique' }]);
});

const listing = (overrides = {}) => ({
  titre: 'Analyse 1, cours et exercices',
  categorie: String(maths._id),
  matiere: 'Analyse 1',
  etat: 'BON',
  prix: 18,
  anneeEdition: 2021,
  prixNeuf: 45,
  ...overrides,
});

const publish = (user, data = listing()) => as(user).post('/api/annonces').send(data);

describe('publication', () => {
  it('crée une annonce avec un prix conseillé', async () => {
    const seller = await createUser();
    const res = await publish(seller);
    expect(res.status).toBe(201);
    expect(res.body.annonce.vendeur.prenom).toBe('Test');
    expect(res.body.annonce.vendeur.email).toBeUndefined();
    expect(res.body.annonce.categorie.nom).toBe('Mathématiques');
    const { min, max, source } = res.body.annonce.prixConseille;
    expect(source).toBe('fallback');
    expect(min).toBeGreaterThan(0);
    expect(max).toBeGreaterThanOrEqual(min);
  });

  it('valide les champs et refuse une catégorie inconnue', async () => {
    const seller = await createUser();
    const res = await publish(seller, listing({ titre: 'A', etat: 'ABIME', categorie: '64b000000000000000000000' }));
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.champs).sort()).toEqual(['categorie', 'etat', 'titre']);
  });

  it('accepte jusqu’à 5 photos et supprime les fichiers si la validation échoue', async () => {
    const seller = await createUser();
    const ok = await as(seller)
      .post('/api/annonces')
      .field(listing())
      .attach('photos', PNG, { filename: 'a.png', contentType: 'image/png' })
      .attach('photos', PNG, { filename: 'b.png', contentType: 'image/png' });
    expect(ok.status).toBe(201);
    expect(ok.body.annonce.photos).toHaveLength(2);

    const before = (await readdir(join(uploadsRoot, 'annonces'))).length;
    const bad = await as(seller).post('/api/annonces').field(listing({ titre: '' })).attach('photos', PNG, { filename: 'c.png', contentType: 'image/png' });
    expect(bad.status).toBe(400);
    expect((await readdir(join(uploadsRoot, 'annonces'))).length).toBe(before);
  });
});

describe('recherche', () => {
  it('filtre par catégorie, état, prix et texte, avec pagination', async () => {
    const seller = await createUser();
    await publish(seller, listing({ titre: 'Probabilités pour ingénieurs', etat: 'TRES_BON', prix: 22 }));
    await publish(seller, listing({ titre: 'Algèbre linéaire, 120 exercices', etat: 'ACCEPTABLE', prix: 9 }));
    await publish(seller, listing({ titre: 'Python pour la Data Science', categorie: String(info._id), matiere: 'Python', prix: 15 }));
    const buyer = await createUser();

    const byCat = await as(buyer).get(`/api/annonces?categorie=${info._id}`);
    expect(byCat.body.annonces.map((a) => a.titre)).toEqual(['Python pour la Data Science']);

    const byEtat = await as(buyer).get('/api/annonces?etat=TRES_BON,ACCEPTABLE&tri=prix_asc');
    expect(byEtat.body.annonces.map((a) => a.prix)).toEqual([9, 22]);

    expect((await as(buyer).get('/api/annonces?prixMax=10')).body.total).toBe(1);
    expect((await as(buyer).get('/api/annonces?q=PROBA ingenieur')).body.annonces[0].titre).toMatch(/Probabilités/);

    const page = await as(buyer).get('/api/annonces?limit=2&page=2');
    expect(page.body).toMatchObject({ total: 3, page: 2, pages: 2 });
    expect(page.body.annonces).toHaveLength(1);
  });

  it('cache les annonces vendues et masquées aux autres, pas au vendeur', async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const sold = (await publish(seller)).body.annonce;
    const masked = (await publish(seller)).body.annonce;
    await as(seller).post(`/api/annonces/${sold._id}/statut`).send({ statut: 'VENDUE' });
    await Book.updateOne({ _id: masked._id }, { statut: 'MASQUEE' });

    expect((await as(buyer).get('/api/annonces')).body.total).toBe(0);
    expect((await as(buyer).get(`/api/annonces/${masked._id}`)).status).toBe(404);
    expect((await as(seller).get('/api/annonces?vendeur=moi')).body.total).toBe(2);
  });

  it('compte les vues des autres étudiants seulement', async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const { _id } = (await publish(seller)).body.annonce;
    await as(seller).get(`/api/annonces/${_id}`);
    await as(buyer).get(`/api/annonces/${_id}`);
    expect((await Book.findById(_id)).vues).toBe(1);
  });
});

describe('modification', () => {
  it('réserve la modification, le statut et la suppression au vendeur', async () => {
    const seller = await createUser();
    const other = await createUser();
    const { _id } = (await publish(seller)).body.annonce;
    expect((await as(other).patch(`/api/annonces/${_id}`).send({ prix: 1 })).status).toBe(403);
    expect((await as(other).post(`/api/annonces/${_id}/statut`).send({ statut: 'VENDUE' })).status).toBe(403);
    expect((await as(other).delete(`/api/annonces/${_id}`)).status).toBe(403);

    const edited = await as(seller).patch(`/api/annonces/${_id}`).send({ prix: 20, etat: 'TRES_BON' });
    expect(edited.body.annonce).toMatchObject({ prix: 20, etat: 'TRES_BON' });
    expect((await as(seller).delete(`/api/annonces/${_id}`)).status).toBe(204);
  });

  it('remplace les photos retirées et respecte la limite de 5', async () => {
    const seller = await createUser();
    const created = await as(seller)
      .post('/api/annonces')
      .field(listing())
      .attach('photos', PNG, { filename: 'a.png', contentType: 'image/png' })
      .attach('photos', PNG, { filename: 'b.png', contentType: 'image/png' });
    const [first, second] = created.body.annonce.photos;
    const res = await as(seller)
      .patch(`/api/annonces/${created.body.annonce._id}`)
      .field('conserver', JSON.stringify([second.url]))
      .attach('photos', PNG, { filename: 'c.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    expect(res.body.annonce.photos.map((p) => p.url)[0]).toBe(second.url);
    expect(res.body.annonce.photos).toHaveLength(2);
    expect((await request(app).get(first.url)).status).toBe(404);
  });

  it('interdit de changer le statut d’une annonce masquée', async () => {
    const seller = await createUser();
    const { _id } = (await publish(seller)).body.annonce;
    await Book.updateOne({ _id }, { statut: 'MASQUEE' });
    const res = await as(seller).post(`/api/annonces/${_id}/statut`).send({ statut: 'DISPONIBLE' });
    expect(res.status).toBe(409);
  });
});

describe('prix conseillé et signalement', () => {
  it('estime un prix sans être connecté et valide les paramètres', async () => {
    const ok = await request(app).get('/api/annonces/prix-conseille?matiere=Probabilités&etat=TRES_BON&anneeEdition=2021&prixNeuf=45');
    expect(ok.status).toBe(200);
    expect(ok.body.min).toBeLessThan(45);
    const bad = await request(app).get('/api/annonces/prix-conseille?etat=TRES_BON&anneeEdition=1800&prixNeuf=-3');
    expect(bad.status).toBe(400);
  });

  it('signale une annonce une seule fois et refuse son propre contenu', async () => {
    const seller = await createUser();
    const reporter = await createUser();
    const { _id } = (await publish(seller)).body.annonce;
    const report = { typeContenu: 'ANNONCE', contenuId: _id, motif: 'Prix abusif pour un livre photocopié' };
    expect((await as(reporter).post('/api/signalements').send(report)).status).toBe(201);
    expect((await as(reporter).post('/api/signalements').send(report)).status).toBe(201);
    expect(await Report.countDocuments()).toBe(1);
    expect((await as(seller).post('/api/signalements').send(report)).body.error.code).toBe('PROPRE_CONTENU');
  });
});
