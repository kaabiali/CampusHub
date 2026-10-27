// Demo dataset for CampusHub. Additive and idempotent: it never deletes anything unless
// called with --reset --yes, which drops the whole database (refused in production).
import mongoose from 'mongoose';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { config } from '../src/config.js';
import { connectDb } from '../src/db.js';
import { hashPassword } from '../src/lib/passwords.js';
import { tunisDay } from '../src/lib/time.js';
import { uploadsRoot } from '../src/lib/upload.js';
import { suggestPrice } from '../src/lib/pricing.js';
import { coordsOf } from '../src/lib/places.js';
import { conversationKey, Message } from '../src/models/Message.js';
import { User } from '../src/models/User.js';
import { Activity } from '../src/models/Activity.js';
import { Category, ensureDefaultCategories } from '../src/models/Category.js';
import { Book } from '../src/models/Book.js';
import { Ride } from '../src/models/Ride.js';
import { Reservation } from '../src/models/Reservation.js';
import { Rating, refreshDriverRating } from '../src/models/Rating.js';
import { Group } from '../src/models/Group.js';
import { GroupMessage } from '../src/models/GroupMessage.js';
import { Club } from '../src/models/Club.js';
import { Event, Registration } from '../src/models/Event.js';
import { Notification } from '../src/models/Notification.js';
import { Report } from '../src/models/Report.js';

export const DEMO_PASSWORD = 'campus2026';
const MARKER = { _id: 'demo-seed', version: 1 };

const args = new Set(process.argv.slice(2));
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const at = (dayOffset, hh, mm = 0) => {
  const day = tunisDay(new Date(Date.now() + dayOffset * DAY));
  return new Date(`${day}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00+01:00`);
};
// Deterministic pseudo-random so two seeds of an empty database produce the same demo.
let state = 42;
const rand = () => ((state = (state * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const STUDENTS = [
  ['Yasmine', 'Ben Salah', 'Ingénierie Data Science', '1ère année', ['Probabilités', 'Statistique', 'Python'], ['Data et IA', 'Langues']],
  ['Rania', 'Jaziri', 'Ingénierie Data Science', '1ère année', ['Analyse 1', 'Probabilités'], ['Culture']],
  ['Skander', 'Mejri', 'Génie logiciel', '2e année', ['Python', 'Bases de données', 'Algorithmique'], ['Open source', 'Développement web']],
  ['Mariem', 'Chaabane', 'Ingénierie Data Science', '2e année', ['Probabilités', 'Statistique', 'Machine Learning'], ['Data et IA']],
  ['Oussama', 'Gharbi', 'Ingénierie Data Science', '1ère année', ['Algèbre linéaire', 'Analyse 1'], ['Sport']],
  ['Amine', 'Trabelsi', 'Génie électrique', '3e année', ['Physique 1', 'Réseaux'], ['Robotique']],
  ['Nour', 'Hammami', 'Génie industriel', '2e année', ['Statistique'], ['Entrepreneuriat']],
  ['Ahmed', 'Karoui', 'Génie civil', '1ère année', ['Physique 1', 'Anglais technique'], ['Sport']],
  ['Ines', 'Ayari', 'Ingénierie Data Science', '1ère année', ['Python', 'Probabilités'], ['Data et IA', 'Bénévolat']],
  ['Mehdi', 'Ben Ali', 'Réseaux et télécommunications', '2e année', ['Réseaux', "Systèmes d'exploitation"], ['Open source']],
  ['Youssef', 'Jlassi', 'Génie logiciel', '1ère année', ['Algorithmique', 'Python'], ['Développement web']],
  ['Asma', 'Toumi', 'Ingénierie Data Science', '2e année', ['Machine Learning', 'Bases de données'], ['Data et IA', 'Entrepreneuriat']],
  ['Hamza', 'Sassi', 'Génie électrique', '1ère année', ['Analyse 1', 'Physique 1'], ['Robotique', 'Sport']],
  ['Lina', 'Ferchichi', 'Génie industriel', '1ère année', ['Statistique', 'Anglais technique'], ['Langues', 'Culture']],
  ['Bilel', 'Mansouri', 'Génie logiciel', '3e année', ['Bases de données'], ['Entrepreneuriat']],
  ['Khalil', 'Riahi', 'Réseaux et télécommunications', '1ère année', ['Réseaux'], ['Sport']],
  ['Emna', 'Bouzid', 'Ingénierie Data Science', 'Master 1', ['Machine Learning', 'Statistique'], ['Bénévolat']],
  ['Firas', 'Hamdi', 'Génie civil', '2e année', ['Analyse 1'], ['Sport', 'Culture']],
  ['Rim', 'Khelifi', 'Génie logiciel', '2e année', ['Algorithmique'], ['Culture', 'Langues']],
  ['Sarra', 'Bouaziz', 'Ingénierie Data Science', '1ère année', ['Algèbre linéaire', 'Python'], ['Data et IA']],
];

const emailOf = (prenom, nom) =>
  `${prenom}.${nom}`
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .concat('@campus.tn');

async function upsertUser(data) {
  const existing = await User.findOne({ email: data.email });
  if (existing) return existing;
  return User.create({ ...data, emailVerifie: true, motDePasseHache: await hashPassword(DEMO_PASSWORD) });
}

// Mongoose stamps creation dates itself; historical demo data needs them backdated directly.
const backdate = (Model, id, field, date) => Model.collection.updateOne({ _id: id }, { $set: { [field]: date } });

function writePdf(name) {
  const dir = join(uploadsRoot, 'documents');
  mkdirSync(dir, { recursive: true });
  const file = `${randomBytes(16).toString('hex')}.pdf`;
  const text = `CampusHub - ${name}`;
  const pdf = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length ${text.length + 37}>>stream\nBT /F1 18 Tf 72 760 Td (${text}) Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n`;
  writeFileSync(join(dir, file), pdf);
  return { url: `/uploads/documents/${file}`, taille: Buffer.byteLength(pdf) };
}

async function seed() {
  await ensureDefaultCategories();
  const cats = Object.fromEntries((await Category.find().lean()).map((c) => [c.nom, c._id]));

  const admin = await upsertUser({ prenom: 'Admin', nom: 'CampusHub', email: 'admin@campus.tn', role: 'ADMIN', filiere: 'Administration' });
  const users = {};
  for (const [prenom, nom, filiere, niveau, matieres, centresInteret] of STUDENTS) {
    users[prenom] = await upsertUser({ prenom, nom, email: emailOf(prenom, nom), filiere, niveau, matieres, centresInteret });
  }
  const U = (p) => users[p]._id;

  // Books: the mockup's catalogue plus a few more, priced around the suggestion.
  const BOOKS = [
    ['Analyse 1, cours et exercices corrigés', 'Mathématiques', 'Analyse 1', 'BON', 2021, 45, 'Rania', 'Quelques annotations au crayon, aucune page manquante.'],
    ['Python pour la Data Science, 2e édition', 'Informatique', 'Python', 'TRES_BON', 2022, 38, 'Skander', ''],
    ['Probabilités et statistique pour ingénieurs', 'Mathématiques', 'Probabilités', 'TRES_BON', 2021, 45, 'Mariem', 'Comme neuf, couverture plastifiée.'],
    ['Algèbre linéaire, 120 exercices', 'Mathématiques', 'Algèbre linéaire', 'ACCEPTABLE', 2015, 30, 'Oussama', 'Surligné sur les chapitres 2 et 3.'],
    ['Physique 1, mécanique du point', 'Physique', 'Physique 1', 'BON', 2019, 32, 'Yasmine', ''],
    ['Introduction aux bases de données', 'Informatique', 'Bases de données', 'BON', 2020, 35, 'Amine', 'Remise possible à la bibliothèque.'],
    ['Machine Learning, les fondamentaux', 'Informatique', 'Machine Learning', 'TRES_BON', 2023, 55, 'Nour', ''],
    ['Anglais technique, niveau B2', 'Langues', 'Anglais technique', 'ACCEPTABLE', 2014, 22, 'Ahmed', ''],
    ['Statistique descriptive et inférentielle', 'Mathématiques', 'Statistique', 'BON', 2018, 40, 'Emna', ''],
    ['Algorithmique, cours et TD', 'Informatique', 'Algorithmique', 'TRES_BON', 2022, 36, 'Bilel', 'Avec les corrigés des TD 1 à 6.'],
    ['Réseaux informatiques, 5e édition', 'Informatique', 'Réseaux', 'BON', 2017, 60, 'Mehdi', ''],
    ['Analyse 1, exercices du partiel', 'Mathématiques', 'Analyse 1', 'NEUF', 2024, 28, 'Firas', 'Jamais ouvert.'],
  ];
  const books = [];
  for (const [titre, cat, matiere, etat, anneeEdition, prixNeuf, seller, description] of BOOKS) {
    const exists = await Book.findOne({ titre, vendeur: U(seller) });
    if (exists) {
      books.push(exists);
      continue;
    }
    const prixConseille = await suggestPrice({ matiere, etat, anneeEdition, prixNeuf });
    const prix = Math.round((prixConseille.min + prixConseille.max) / 2 + (rand() > 0.7 ? 3 : 0));
    const book = await Book.create({ vendeur: U(seller), categorie: cats[cat], titre, matiere, etat, anneeEdition, prixNeuf, prix, prixConseille, description, vues: Math.floor(rand() * 40) });
    await backdate(Book, book._id, 'datePublication', new Date(Date.now() - rand() * 20 * DAY));
    books.push(book);
  }
  const lot = await Book.create({ vendeur: U('Hamza'), categorie: cats['Mathématiques'], titre: 'Lot de 10 livres de maths', matiere: 'Analyse 1', etat: 'ACCEPTABLE', prix: 300, description: 'Prix ferme.' });
  await Book.updateOne({ titre: 'Anglais technique, niveau B2' }, { statut: 'VENDUE' });

  // Rides: tomorrow-morning commutes plus past rides that carry ratings.
  const RIDES = [
    [1, 7, 15, 'La Marsa, Corniche', 35, 'Skander', 3, 3, 'Peugeot 208 bleue', ['Rania', 'Ines']],
    [1, 7, 30, 'La Marsa, centre', 35, 'Amine', 3, 3, 'Clio grise', ['Mariem', 'Oussama']],
    [1, 8, 0, 'Sidi Bou Saïd, gare TGM', 30, 'Nour', 3, 2.5, 'Polo noire', []],
    [1, 12, 45, 'La Marsa, Plage', 35, 'Ahmed', 1, 3, 'Kia Picanto blanche', ['Firas']],
    [2, 7, 45, 'Ariana, Menzah 6', 25, 'Bilel', 4, 3, 'Golf 7 grise', ['Youssef']],
    [2, 8, 15, 'Lac 2', 20, 'Asma', 2, 2, 'Fiat 500 rouge', []],
    [3, 7, 30, 'Le Bardo', 40, 'Mehdi', 3, 3.5, 'Symbol beige', ['Khalil']],
  ];
  const created = [];
  for (const [day, hh, mm, depart, duree, driver, seats, prix, vehicule, passengers] of RIDES) {
    const dateDepart = at(day, hh, mm);
    if (await Ride.exists({ conducteur: U(driver), dateDepart })) continue;
    const ride = await Ride.create({ conducteur: U(driver), lieuDepart: depart, lieuArrivee: 'Campus', coordDepart: coordsOf(depart), coordArrivee: coordsOf('Campus'), dateDepart, dureeMinutes: duree, placesTotales: seats, placesDisponibles: seats - passengers.length, prix, vehicule, statut: seats === passengers.length ? 'COMPLET' : 'OUVERT', details: 'Rendez-vous 5 minutes avant le départ.' });
    for (const p of passengers) await Reservation.create({ trajet: ride._id, passager: U(p), nbPlaces: 1 });
    created.push(ride);
  }
  for (let d = 2; d <= 9; d++) {
    const driver = pick(['Amine', 'Skander', 'Nour', 'Ahmed', 'Bilel']);
    const depart = pick(['La Marsa, centre', 'Ariana, Menzah 6', 'Sidi Bou Saïd, gare TGM', 'Lac 2']);
    const ride = await Ride.create({ conducteur: U(driver), lieuDepart: depart, lieuArrivee: 'Campus', coordDepart: coordsOf(depart), coordArrivee: coordsOf('Campus'), dateDepart: at(-d, 7, 30), dureeMinutes: 35, placesTotales: 3, placesDisponibles: 1, prix: 3, statut: 'TERMINE' });
    for (const p of [pick(['Rania', 'Yasmine', 'Ines']), pick(['Oussama', 'Firas', 'Sarra'])]) {
      const res = await Reservation.create({ trajet: ride._id, passager: U(p), nbPlaces: 1 }).catch(() => null);
      if (res && rand() > 0.25) await Rating.create({ reservation: res._id, trajet: ride._id, auteur: U(p), conducteur: U(driver), note: rand() > 0.3 ? 5 : 4, commentaire: pick(['Ponctuel', 'Très sympa', '', 'Conduite prudente']) });
    }
  }
  for (const d of ['Amine', 'Skander', 'Nour', 'Ahmed', 'Bilel']) await refreshDriverRating(U(d));

  // Clubs with designated leaders (only they can publish events for their club).
  const CLUBS = [
    ['Club IEEE', 'Branche étudiante IEEE du campus', ['Mariem']],
    ['Club Entrepreneuriat', 'Ateliers, pitchs et rencontres avec des fondateurs', ['Nour']],
    ['Club Sport', 'Tournois inter-filières et entraînements', ['Ahmed']],
    ['Club Culture', 'Ciné-débats, théâtre et sorties', ['Rim']],
    ['Club Open Source', 'Contributions, Git et logiciels libres', ['Skander']],
    ['Club Croissant-Rouge', 'Collectes et actions solidaires', ['Emna']],
  ];
  const clubs = {};
  for (const [nom, description, leaders] of CLUBS) {
    clubs[nom] = await Club.findOneAndUpdate({ nom }, { $setOnInsert: { nom, description, responsables: leaders.map(U) } }, { upsert: true, returnDocument: 'after' });
  }

  const EVENTS = [
    ['Club IEEE', 'Hackathon Data For Good', 3, 9, 18, 'Amphi B', 120, 'Équipes de 3 à 5, données publiques fournies. Petit-déjeuner offert.', 'Mariem', 34],
    ['Club Entrepreneuriat', 'Atelier CV et LinkedIn', 8, 14, 16, 'Salle C12', 40, 'Relecture de CV par des recruteurs, photos de profil sur place.', 'Nour', 31],
    ['Club Sport', 'Tournoi de football inter-filières', 15, 16, 19, 'Terrain du campus', 96, 'Inscription par équipe de 8, maillots fournis.', 'Ahmed', 12],
    ['Club Culture', 'Soirée ciné-débat', 18, 18, 21, 'Amphi A', 150, 'Projection suivie d’un débat avec la réalisatrice.', 'Rim', 54],
    ['Club Open Source', 'Initiation à Git et GitHub', 22, 10, 12, 'Labo info 2', 25, 'Apportez votre ordinateur. Aucun prérequis.', 'Skander', 18],
    ['Club Croissant-Rouge', 'Collecte de sang', 30, 9, 15, 'Hall principal', null, 'Entrée libre, pensez à manger avant.', 'Emna', 9],
  ];
  const regPool = Object.keys(users);
  for (const [club, titre, day, h1, h2, lieu, capacite, description, organiser, wanted] of EVENTS) {
    if (await Event.exists({ titre, club: clubs[club]._id })) continue;
    const event = await Event.create({ organisateur: U(organiser), club: clubs[club]._id, titre, description, lieu, dateDebut: at(day, h1), dateFin: at(day, h2), capacite });
    const regs = regPool.filter((p) => p !== organiser).slice(0, Math.min(wanted, regPool.length - 1));
    await Registration.insertMany(regs.map((p) => ({ evenement: event._id, utilisateur: U(p) })));
    await Event.updateOne({ _id: event._id }, { nbInscrits: regs.length });
  }

  const GROUPS = [
    ['Probabilités, révision du partiel', 'Probabilités', 'Séances chaque jeudi avant le partiel. Lois discrètes, continues, TD corrigés.', 'Mariem', ['Yasmine', 'Oussama', 'Rania', 'Ines', 'Sarra'], [[2, 14, 'Lois discrètes et variables aléatoires', 'Bibliothèque, salle 2'], [9, 14, 'Lois continues, exercices du TD 4', 'En ligne']], ['Résumé chapitre 3.pdf', 'TD 4 corrigé.pdf', 'Annales 2025.pdf']],
    ['Algèbre linéaire, entraide', 'Algèbre linéaire', 'Exercices de diagonalisation, séries 3 et 4.', 'Oussama', ['Yasmine', 'Amine', 'Skander'], [[5, 16, 'Diagonalisation, série 3', 'Salle C08']], ['Série 3.pdf']],
    ['Python et Pandas', 'Python', 'Mini-projets avec Pandas, du nettoyage à la visualisation.', 'Yasmine', ['Skander', 'Nour', 'Ahmed', 'Ines', 'Youssef', 'Asma', 'Sarra'], [[4, 10, 'Nettoyage de données avec Pandas', 'Labo info 3']], ['Notebook séance 2.pdf', 'Cheat sheet Pandas.pdf']],
    ['Statistique descriptive', 'Statistique', 'Révision des indicateurs et de la régression simple.', 'Emna', ['Lina', 'Nour'], [[6, 13, 'Régression linéaire simple', 'Salle B04']], []],
    ['Préparation TOEIC', 'Anglais technique', 'Entraînement aux parties listening et reading.', 'Lina', ['Ahmed', 'Rim'], [[7, 17, 'Listening, parties 3 et 4', 'Salle de langues']], []],
    ['Machine Learning, projets', 'Machine Learning', 'Lecture de papiers et petits projets scikit-learn.', 'Asma', ['Mariem', 'Emna'], [[10, 15, 'Random Forest et validation croisée', 'Labo info 1']], []],
  ];
  for (const [nom, matiere, description, creator, members, sessions, docs] of GROUPS) {
    if (await Group.exists({ nom })) continue;
    await Group.create({
      nom,
      matiere,
      description,
      createur: U(creator),
      membres: [{ utilisateur: U(creator), role: 'CREATEUR' }, ...members.map((m) => ({ utilisateur: U(m) }))],
      seances: sessions.map(([d, h, sujet, lieu]) => ({ date: at(d, h), duree: 90, sujet, lieu, creePar: U(creator) })),
      documents: docs.map((nomFichier) => ({ nomFichier, ...writePdf(nomFichier), deposePar: U(pick([creator, ...members])) })),
    });
  }

  // A few group-chat messages so the discussion area isn't empty in the demo.
  const proba = await Group.findOne({ nom: 'Probabilités, révision du partiel' });
  if (proba && !(await GroupMessage.exists({ groupe: proba._id }))) {
    const GROUP_MESSAGES = [
      ['Yasmine', "J'ai ajouté le résumé du chapitre 3 dans les documents.", 3100],
      ['Mariem', 'Merci ! On le relit jeudi avant la séance ?', 3050],
      ['Oussama', 'Je peux préparer deux exercices sur les lois continues.', 2980],
      ['Rania', 'Parfait, je m’occupe des annales de l’an dernier.', 2940],
    ];
    for (const [auteur, contenu, minutesAgo] of GROUP_MESSAGES) {
      const message = await GroupMessage.create({ groupe: proba._id, auteur: U(auteur), contenu, clientId: `seed-${randomBytes(6).toString('hex')}` });
      await backdate(GroupMessage, message._id, 'dateEnvoi', new Date(Date.now() - minutesAgo * 60 * 1000));
    }
  }

  // Conversations from the mockup's messaging screen.
  const analyse = books.find((b) => b.titre.startsWith('Analyse 1, cours'));
  const firstRide = created.find((r) => r.lieuDepart === 'La Marsa, centre') ?? created[0];
  const THREADS = [
    ['Yasmine', 'Rania', analyse && { type: 'ANNONCE', ref: analyse._id, libelle: analyse.titre }, [['Yasmine', 'Bonjour, le livre Analyse 1 est toujours disponible ?', 180], ['Rania', 'Oui, toujours. Il est en bon état, quelques annotations au crayon.', 172], ['Yasmine', 'Parfait. On peut se voir demain à la bibliothèque vers 12:30 ?', 150]]],
    ['Mariem', 'Amine', firstRide && { type: 'TRAJET', ref: firstRide._id, libelle: `${firstRide.lieuDepart} → Campus` }, [['Mariem', 'Merci pour la confirmation. Je serai devant la pharmacie à 07:25.', 1500], ['Amine', 'Ça marche, voiture grise. À demain.', 1490]]],
    ['Mariem', 'Yasmine', null, [['Mariem', "J'ai ajouté le résumé du chapitre 3 dans le groupe.", 2900]]],
  ];
  for (const [a, b, contexte, msgs] of THREADS) {
    const key = conversationKey(U(a), U(b));
    if (await Message.exists({ cleConversation: key })) continue;
    for (const [from, contenu, minutesAgo] of msgs) {
      const to = from === a ? b : a;
      const m = await Message.create({ expediteur: U(from), destinataire: U(to), cleConversation: key, contenu, clientId: `seed-${randomBytes(6).toString('hex')}`, contexte, lu: minutesAgo > 160 });
      await backdate(Message, m._id, 'dateEnvoi', new Date(Date.now() - minutesAgo * 60 * 1000));
    }
  }

  await Notification.create([
    { utilisateur: U('Amine'), type: 'RESERVATION', contenu: 'Mariem Chaabane a réservé une place sur votre trajet La Marsa, centre → Campus.', lien: firstRide ? `/covoiturage/${firstRide._id}` : null },
    { utilisateur: U('Yasmine'), type: 'MESSAGE', contenu: 'Rania Jaziri : Oui, toujours. Il est en bon état…', lien: `/messages/${U('Rania')}` },
  ]);

  await Report.create([
    { typeContenu: 'ANNONCE', contenuId: lot._id, motif: 'Prix abusif', signalePar: U('Skander') },
    { typeContenu: 'ANNONCE', contenuId: lot._id, motif: 'Lot sans détail des titres', signalePar: U('Lina') },
  ]);

  // Daily activity for the admin charts: weekdays busier than weekends.
  const ids = Object.values(users).map((u) => u._id).concat(admin._id);
  const docs = [];
  for (let d = 0; d < 30; d++) {
    const date = new Date(Date.now() - d * DAY);
    const weekend = [0, 6].includes(new Date(`${tunisDay(date)}T12:00:00Z`).getUTCDay());
    for (const id of ids) if (rand() < (weekend ? 0.25 : 0.7)) docs.push({ utilisateur: id, jour: tunisDay(date) });
  }
  await Activity.insertMany(docs, { ordered: false }).catch((err) => {
    if (err.code !== 11000 && !err.writeErrors) throw err;
  });
}

async function main() {
  await connectDb(config.mongoUrl);
  const db = mongoose.connection.db;
  if (args.has('--reset')) {
    if (config.isProd) throw new Error('Refusing to reset a production database.');
    if (!args.has('--yes')) {
      console.error(`--reset drops EVERY collection of "${db.databaseName}", including real accounts. Re-run with --reset --yes to confirm.`);
      process.exitCode = 2;
      return;
    }
    await db.dropDatabase();
    console.log(`Database "${db.databaseName}" dropped.`);
  }
  if (await db.collection('meta').findOne({ _id: MARKER._id })) {
    console.log('Demo data already present; nothing to do. (Use --reset --yes for a clean slate.)');
    return;
  }
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  await seed();
  await db.collection('meta').updateOne({ _id: MARKER._id }, { $set: { ...MARKER, date: new Date() } }, { upsert: true });
  console.log(`Demo data created. Every demo account uses the password "${DEMO_PASSWORD}" (admin: admin@campus.tn).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
