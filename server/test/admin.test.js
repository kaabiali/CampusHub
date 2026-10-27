import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, as, createUser } from './helpers.js';
import { User } from '../src/models/User.js';
import { Book } from '../src/models/Book.js';
import { Category } from '../src/models/Category.js';
import { Ride } from '../src/models/Ride.js';
import { Reservation } from '../src/models/Reservation.js';
import { Group } from '../src/models/Group.js';
import { GroupMessage } from '../src/models/GroupMessage.js';
import { Club } from '../src/models/Club.js';
import { Event, Registration } from '../src/models/Event.js';
import { Message } from '../src/models/Message.js';
import { Report } from '../src/models/Report.js';
import { Notification } from '../src/models/Notification.js';
import { Activity } from '../src/models/Activity.js';
import { tunisDay } from '../src/lib/time.js';

const inHours = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();

async function listing(seller, overrides = {}) {
  const cat = await Category.findOne() ?? (await Category.create({ nom: 'Mathématiques' }));
  return (await as(seller).post('/api/annonces').send({ titre: 'Lot de 10 livres', categorie: String(cat._id), matiere: 'Analyse 1', etat: 'BON', prix: 300, ...overrides })).body.annonce;
}

describe('accès', () => {
  it('réserve l’administration aux administrateurs', async () => {
    const student = await createUser();
    for (const url of ['/api/admin/stats', '/api/admin/utilisateurs', '/api/admin/signalements']) {
      expect((await as(student).get(url)).body.error.code).toBe('ADMIN_REQUIS');
    }
    expect((await request(app).get('/api/admin/stats')).status).toBe(401);
  });
});

describe('statistiques', () => {
  it('agrège l’activité de la période', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const s = await createUser({ matieres: ['Probabilités', 'Python'] });
    await createUser({ matieres: ['Probabilités'] });
    await Activity.create([{ utilisateur: s._id, jour: tunisDay() }, { utilisateur: admin._id, jour: tunisDay() }]);
    await listing(s, { prix: 15 });
    await as(s).post('/api/trajets').send({ lieuDepart: 'La Marsa', lieuArrivee: 'Campus', dateDepart: inHours(-0.5 + 1), placesTotales: 3, prix: 3 });
    await Ride.updateMany({}, { dateDepart: new Date(Date.now() - 3600 * 1000) });
    const b = await createUser();
    await as(s).post(`/api/conversations/${b._id}/messages`).send({ contenu: 'Salut', clientId: 'st-1' });

    const res = (await as(admin).get('/api/admin/stats?periode=7')).body;
    expect(res.actifsParJour).toHaveLength(7);
    expect(res.actifsParJour.at(-1)).toEqual({ jour: tunisDay(), utilisateurs: 2 });
    expect(res.kpis.utilisateursActifs.valeur).toBe(2);
    expect(res.kpis.annoncesPubliees.valeur).toBe(1);
    expect(res.kpis.trajets.valeur).toBe(1);
    expect(res.matieresDemandees[0]).toEqual({ matiere: 'Probabilités', etudiants: 2 });
    expect(res.trajetsFrequents[0]).toMatchObject({ depart: 'La Marsa', arrivee: 'Campus', trajets: 1 });
    expect(res.activiteParHeure).toHaveLength(24);
    expect(res.activiteParHeure.reduce((n, h) => n + h.messages, 0)).toBe(1);
    expect((await as(admin).get('/api/admin/stats?periode=semestre')).body.actifsParJour).toHaveLength(120);
  });
});

describe('utilisateurs', () => {
  it('bloque (sessions révoquées) puis débloque', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const s = await createUser();
    const session = as(s);
    await as(admin).post(`/api/admin/utilisateurs/${s._id}/bloquer`).send({ bloque: true });
    expect((await session.get('/api/auth/moi')).body.utilisateur).toBeNull();
    expect((await request(app).post('/api/auth/connexion').send({ email: s.email, motDePasse: 'motdepasse1' })).body.error.code).toBe('COMPTE_BLOQUE');
    expect((await as(admin).get('/api/admin/utilisateurs?statut=bloques')).body.utilisateurs.map((u) => u.email)).toEqual([s.email]);
    await as(admin).post(`/api/admin/utilisateurs/${s._id}/bloquer`).send({ bloque: false });
    expect((await request(app).post('/api/auth/connexion').send({ email: s.email, motDePasse: 'motdepasse1' })).status).toBe(200);
  });

  it('protège son propre compte et les autres administrateurs', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const other = await createUser({ role: 'ADMIN' });
    expect((await as(admin).post(`/api/admin/utilisateurs/${admin._id}/bloquer`).send({ bloque: true })).body.error.code).toBe('PROPRE_COMPTE');
    expect((await as(admin).delete(`/api/admin/utilisateurs/${other._id}`)).body.error.code).toBe('CIBLE_ADMIN');
  });

  it('supprime en anonymisant et en retirant proprement les contenus', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const target = await createUser({ prenom: 'Ahmed', nom: 'Karoui' });
    const passenger = await createUser();
    const member = await createUser();
    const book = await listing(target);
    const ride = (await as(target).post('/api/trajets').send({ lieuDepart: 'Ariana', lieuArrivee: 'Campus', dateDepart: inHours(20), placesTotales: 2, prix: 3 })).body.trajet;
    await as(passenger).post(`/api/trajets/${ride._id}/reservations`).send({});
    const shared = (await as(target).post('/api/groupes').send({ nom: 'Groupe partagé', matiere: 'Python' })).body.groupe;
    await as(member).post(`/api/groupes/${shared._id}/membres`);
    const solo = (await as(target).post('/api/groupes').send({ nom: 'Groupe solo', matiere: 'Python' })).body.groupe;
    const leader = await createUser();
    const club = await Club.create({ nom: 'Club Test', responsables: [leader._id] });
    const event = (await as(leader).post('/api/evenements').send({ club: String(club._id), titre: 'Atelier', lieu: 'Salle 1', dateDebut: inHours(40) })).body.evenement;
    await as(target).post(`/api/evenements/${event._id}/inscription`);

    expect((await as(admin).delete(`/api/admin/utilisateurs/${target._id}`)).status).toBe(204);
    const gone = await User.findById(target._id);
    expect(gone).toMatchObject({ prenom: 'Compte', nom: 'supprimé', estSupprime: true });
    expect(gone.email).toMatch(/@supprime\.invalid$/);
    expect((await Book.findById(book._id)).statut).toBe('MASQUEE');
    expect((await Ride.findById(ride._id)).statut).toBe('ANNULE');
    expect(await Notification.countDocuments({ utilisateur: passenger._id, contenu: /annulé car le compte/ })).toBe(1);
    const g = await Group.findById(shared._id);
    expect(String(g.createur)).toBe(String(member._id));
    expect(g.membres[0].role).toBe('CREATEUR');
    expect(await Group.findById(solo._id)).toBeNull();
    expect((await Event.findById(event._id)).nbInscrits).toBe(0);
    expect((await request(app).post('/api/auth/connexion').send({ email: target.email, motDePasse: 'motdepasse1' })).status).toBe(401);
  });
});

describe('catégories', () => {
  it('crée, refuse les doublons et protège les catégories utilisées', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const { categorie } = (await as(admin).post('/api/admin/categories').send({ nom: 'Chimie' })).body;
    expect((await as(admin).post('/api/admin/categories').send({ nom: 'Chimie' })).body.error.champs.nom).toMatch(/existe déjà/);
    await listing(await createUser(), { categorie: categorie._id });
    expect((await as(admin).delete(`/api/admin/categories/${categorie._id}`)).body.error.code).toBe('CATEGORIE_UTILISEE');
    const free = (await as(admin).post('/api/admin/categories').send({ nom: 'Arts' })).body.categorie;
    expect((await as(admin).delete(`/api/admin/categories/${free._id}`)).status).toBe(204);
  });
});

describe('modération', () => {
  it('retire le contenu et clôt tous les signalements le concernant', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const seller = await createUser();
    const book = await listing(seller);
    const [r1, r2] = [await createUser(), await createUser()];
    await as(r1).post('/api/signalements').send({ typeContenu: 'ANNONCE', contenuId: book._id, motif: 'Prix abusif' });
    await as(r2).post('/api/signalements').send({ typeContenu: 'ANNONCE', contenuId: book._id, motif: 'Arnaque suspectée' });

    const pending = (await as(admin).get('/api/admin/signalements')).body.signalements;
    expect(pending).toHaveLength(2);
    expect(pending[0].contenu).toMatchObject({ titre: 'Lot de 10 livres', lien: `/livres/${book._id}` });

    await as(admin).post(`/api/admin/signalements/${pending[0]._id}/traiter`);
    expect((await Book.findById(book._id)).statut).toBe('MASQUEE');
    expect(await Report.countDocuments({ statut: 'TRAITE' })).toBe(2);
    expect((await as(admin).post(`/api/admin/signalements/${pending[1]._id}/rejeter`)).body.error.code).toBe('DEJA_TRAITE');
    expect((await as(admin).get('/api/admin/signalements?statut=TRAITES')).body.total).toBe(2);
  });

  it('rejette un seul signalement sans toucher au contenu', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const book = await listing(await createUser());
    await as(await createUser()).post('/api/signalements').send({ typeContenu: 'ANNONCE', contenuId: book._id, motif: 'Pas convaincu' });
    const [report] = (await as(admin).get('/api/admin/signalements')).body.signalements;
    expect((await as(admin).post(`/api/admin/signalements/${report._id}/rejeter`)).body.signalement.statut).toBe('REJETE');
    expect((await Book.findById(book._id)).statut).toBe('DISPONIBLE');
  });

  it('ne laisse signaler un message que par son destinataire, puis le masque', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const [author, recipient, stranger] = [await createUser(), await createUser(), await createUser()];
    const { message } = (await as(author).post(`/api/conversations/${recipient._id}/messages`).send({ contenu: 'Contenu inapproprié', clientId: 'mod-1' })).body;
    const report = { typeContenu: 'MESSAGE', contenuId: message._id, motif: 'Contenu inapproprié' };
    expect((await as(stranger).post('/api/signalements').send(report)).body.error.code).toBe('NON_DESTINATAIRE');
    expect((await as(recipient).post('/api/signalements').send(report)).status).toBe(201);
    const [r] = (await as(admin).get('/api/admin/signalements')).body.signalements;
    await as(admin).post(`/api/admin/signalements/${r._id}/traiter`);
    expect((await Message.findById(message._id)).contenu).toBe('[Message retiré par la modération]');
  });
});

describe('suppression de contenus', () => {
  it('exige un administrateur, un type connu et un motif', async () => {
    const student = await createUser();
    const admin = await createUser({ role: 'ADMIN' });
    const book = await listing(await createUser());
    const url = `/api/admin/contenus/LIVRE/${book._id}`;

    expect((await as(student).delete(url).send({ motif: 'Contenu trompeur' })).body.error.code).toBe('ADMIN_REQUIS');
    expect((await as(admin).delete(`/api/admin/contenus/INCONNU/${book._id}`).send({ motif: 'Contenu trompeur' })).body.error.code).toBe('VALIDATION');
    const short = await as(admin).delete(url).send({ motif: 'non' });
    expect(short.status).toBe(400);
    expect(short.body.error.champs.motif).toMatch(/5 à 200/);
    expect((await as(admin).delete(`/api/admin/contenus/LIVRE/${book._id}`).send({ motif: 'Annonce trompeuse' })).status).toBe(204);
    expect(await Book.findById(book._id)).toBeNull();
  });

  it('supprime une annonce, prévient le vendeur et clôt les signalements', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const seller = await createUser();
    const book = await listing(seller);
    await as(await createUser()).post('/api/signalements').send({ typeContenu: 'ANNONCE', contenuId: book._id, motif: 'Prix trompeur' });

    expect((await as(admin).delete(`/api/admin/contenus/LIVRE/${book._id}`).send({ motif: 'Annonce trompeuse' })).status).toBe(204);
    expect(await Book.findById(book._id)).toBeNull();
    expect((await Report.findOne({ contenuId: book._id })).statut).toBe('TRAITE');
    const notification = await Notification.findOne({ utilisateur: seller._id, type: 'MODERATION' });
    expect(notification.contenu).toContain(book.titre);
    expect(notification.contenu).toContain('Annonce trompeuse');
  });

  it('supprime un trajet, ses réservations, et prévient conducteur et passagers', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const driver = await createUser();
    const passenger = await createUser();
    const ride = (await as(driver).post('/api/trajets').send({ lieuDepart: 'Ariana', lieuArrivee: 'Campus', dateDepart: inHours(20), placesTotales: 2, prix: 3 })).body.trajet;
    await as(passenger).post(`/api/trajets/${ride._id}/reservations`).send({});

    expect((await as(admin).delete(`/api/admin/contenus/TRAJET/${ride._id}`).send({ motif: 'Conducteur ne répond plus' })).status).toBe(204);
    expect(await Ride.findById(ride._id)).toBeNull();
    expect(await Reservation.countDocuments({ trajet: ride._id })).toBe(0);
    expect((await Notification.findOne({ utilisateur: driver._id, type: 'MODERATION' })).contenu).toContain('Conducteur ne répond plus');
    expect((await Notification.findOne({ utilisateur: passenger._id, type: 'MODERATION' })).contenu).toContain('retiré');
  });

  it('supprime un événement et ses inscriptions, et prévient organisateur et inscrits', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const leader = await createUser();
    const attendee = await createUser();
    const club = await Club.create({ nom: 'Club Suppression', responsables: [leader._id] });
    const event = (await as(leader).post('/api/evenements').send({ club: String(club._id), titre: 'Atelier PHP', lieu: 'Salle 3', dateDebut: inHours(30) })).body.evenement;
    await as(attendee).post(`/api/evenements/${event._id}/inscription`);

    expect((await as(admin).delete(`/api/admin/contenus/EVENEMENT/${event._id}`).send({ motif: 'Salle déjà réservée' })).status).toBe(204);
    expect(await Event.findById(event._id)).toBeNull();
    expect(await Registration.countDocuments({ evenement: event._id })).toBe(0);
    expect((await Notification.findOne({ utilisateur: leader._id, type: 'MODERATION' })).contenu).toContain('Salle déjà réservée');
    expect((await Notification.findOne({ utilisateur: attendee._id, type: 'MODERATION' })).contenu).toContain('Atelier PHP');
  });

  it('supprime un groupe, ses messages, et prévient créateur et membres', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const creator = await createUser();
    const member = await createUser();
    const group = (await as(creator).post('/api/groupes').send({ nom: 'Groupe à retirer', matiere: 'Réseaux' })).body.groupe;
    await as(member).post(`/api/groupes/${group._id}/membres`);
    await GroupMessage.create({ groupe: group._id, auteur: creator._id, contenu: 'Bienvenue', clientId: 'msg-1' });

    expect((await as(admin).delete(`/api/admin/contenus/GROUPE/${group._id}`).send({ motif: 'Contenu hors charte' })).status).toBe(204);
    expect(await Group.findById(group._id)).toBeNull();
    expect(await GroupMessage.countDocuments({ groupe: group._id })).toBe(0);
    expect((await Notification.findOne({ utilisateur: creator._id, type: 'MODERATION' })).contenu).toContain('Contenu hors charte');
    expect((await Notification.findOne({ utilisateur: member._id, type: 'MODERATION' })).contenu).toContain('supprimé');
  });
});
