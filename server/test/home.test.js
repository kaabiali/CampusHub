import { describe, it, expect } from 'vitest';
import { as, createUser } from './helpers.js';
import { Group } from '../src/models/Group.js';
import { Club } from '../src/models/Club.js';
import { Category } from '../src/models/Category.js';

const inHours = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();

async function catalog() {
  const owner = await createUser();
  const leader = await createUser();
  const club = await Club.create({ nom: `Club Data ${Math.random()}`, responsables: [leader._id] });
  const cat = await Category.create({ nom: `Maths ${Math.random()}` });
  const proba = (await as(owner).post('/api/groupes').send({ nom: 'Probabilités, révision du partiel', matiere: 'Probabilités' })).body.groupe;
  await as(owner).post('/api/groupes').send({ nom: 'Tournoi de football', matiere: 'Sport' });
  await as(owner).post('/api/groupes').send({ nom: 'Probabilités avancées', matiere: 'Probabilités', capaciteMax: 2 });
  const event = (await as(leader).post('/api/evenements').send({ club: String(club._id), titre: 'Atelier Python et Pandas', lieu: 'Labo 3', dateDebut: inHours(48) })).body.evenement;
  await as(owner).post('/api/annonces').send({ titre: 'Probabilités et statistique', categorie: String(cat._id), matiere: 'Probabilités', etat: 'BON', prix: 20 });
  return { owner, proba, event };
}

describe('recommandations (repli sans service ML)', () => {
  it('propose groupes, événements et livres proches du profil, avec la raison', async () => {
    const { proba, event } = await catalog();
    const student = await createUser({ matieres: ['Probabilités', 'Python'], centresInteret: ['Data et IA'] });
    const res = await as(student).get('/api/recommandations');
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('fallback');
    expect(res.body.groupes[0]).toMatchObject({ _id: proba._id, raison: 'Vous suivez Probabilités', nbMembres: 1 });
    expect(res.body.groupes.map((g) => g.nom)).not.toContain('Tournoi de football');
    expect(res.body.evenements.map((e) => e._id)).toEqual([event._id]);
    expect(res.body.livres[0].titre).toBe('Probabilités et statistique');
  });

  it('exclut ce que l’étudiant a déjà rejoint, et se met à jour aussitôt', async () => {
    const { owner, proba } = await catalog();
    const student = await createUser({ matieres: ['Probabilités'] });
    expect((await as(student).get('/api/recommandations')).body.groupes.map((g) => g._id)).toContain(proba._id);
    await as(student).post(`/api/groupes/${proba._id}/membres`);
    expect((await as(student).get('/api/recommandations')).body.groupes.map((g) => g._id)).not.toContain(proba._id);
    expect((await as(owner).get('/api/recommandations')).body.livres).toEqual([]);
  });

  it('ne propose rien tant que le profil est vide', async () => {
    await catalog();
    const res = await as(await createUser()).get('/api/recommandations');
    expect(res.body).toMatchObject({ groupes: [], evenements: [], livres: [] });
  });

  it('ignore les groupes complets', async () => {
    await catalog();
    const full = await Group.findOne({ nom: 'Probabilités avancées' });
    await Group.updateOne({ _id: full._id }, { $push: { membres: { utilisateur: (await createUser())._id } } });
    const res = await as(await createUser({ matieres: ['Probabilités'] })).get('/api/recommandations');
    expect(res.body.groupes.map((g) => g.nom)).not.toContain('Probabilités avancées');
  });
});

describe('accueil', () => {
  it('résume l’activité de l’étudiant', async () => {
    const driver = await createUser();
    const student = await createUser();
    const ride = (await as(driver).post('/api/trajets').send({ lieuDepart: 'La Marsa', lieuArrivee: 'Campus', dateDepart: inHours(20), placesTotales: 3, prix: 3 })).body.trajet;
    await as(student).post(`/api/trajets/${ride._id}/reservations`).send({});
    await as(driver).post(`/api/conversations/${student._id}/messages`).send({ contenu: 'À demain', clientId: 'acc-1' });
    const g = (await as(student).post('/api/groupes').send({ nom: 'Algèbre linéaire, entraide', matiere: 'Algèbre' })).body.groupe;
    await as(student).post(`/api/groupes/${g._id}/seances`).send({ date: inHours(30), lieu: 'Salle C08', sujet: 'Diagonalisation' });

    const res = (await as(student).get('/api/accueil')).body;
    expect(res).toMatchObject({ annoncesActives: 0, trajetsReserves: 1, nbGroupes: 1, messagesNonLus: 1 });
    expect(res.prochainTrajet.lieuDepart).toBe('La Marsa');
    expect(res.prochaineSeance).toMatchObject({ sujet: 'Diagonalisation', groupe: { nom: 'Algèbre linéaire, entraide' } });
    expect((await as(driver).get('/api/accueil')).body.prochainConduit._id).toBe(ride._id);
  });
});
