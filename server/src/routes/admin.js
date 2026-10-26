import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { body, matchedData, param, query } from 'express-validator';
import { User, publicUserFields } from '../models/User.js';
import { Activity } from '../models/Activity.js';
import { Book } from '../models/Book.js';
import { Category } from '../models/Category.js';
import { Ride } from '../models/Ride.js';
import { Reservation } from '../models/Reservation.js';
import { Group } from '../models/Group.js';
import { Event, Registration } from '../models/Event.js';
import { Message } from '../models/Message.js';
import { Report } from '../models/Report.js';
import { requireAdmin, requireAuth } from '../lib/auth.js';
import { validate } from '../lib/validate.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { tunisDay, TIME_ZONE } from '../lib/time.js';
import { hashPassword } from '../lib/passwords.js';
import { notify } from '../lib/notify.js';
import { disconnectUser } from '../lib/realtime.js';
import { removeUpload } from '../lib/upload.js';

export const adminRouter = Router();
adminRouter.use(requireAuth(), requireAdmin);

const DAY = 864e5;
const PERIODS = { 7: 7, 30: 30, semestre: 120 };

function periodRange(periode) {
  const days = PERIODS[periode] ?? 30;
  const end = new Date();
  const start = new Date(end.getTime() - days * DAY);
  return { days, start, end, prevStart: new Date(start.getTime() - days * DAY) };
}

const pctChange = (now, before) => (before ? Math.round(((now - before) / before) * 1000) / 10 : null);

adminRouter.get('/stats', validate(query('periode').optional().isIn(Object.keys(PERIODS))), async (req, res) => {
  const { days, start, end, prevStart } = periodRange(req.query.periode);
  const dayKeys = Array.from({ length: days }, (_, i) => tunisDay(new Date(start.getTime() + (i + 1) * DAY)));
  const inRange = (field, from, to) => ({ [field]: { $gt: from, $lte: to } });

  const [daily, activeNow, activeBefore, signups, signupsBefore, listings, listingsBefore, rides, ridesBefore, pending, resolved, subjects, routes, hours] = await Promise.all([
    Activity.aggregate([{ $match: { jour: { $gte: dayKeys[0] } } }, { $group: { _id: '$jour', n: { $sum: 1 } } }]),
    Activity.distinct('utilisateur', { jour: { $gte: dayKeys[0] } }).then((a) => a.length),
    Activity.distinct('utilisateur', { jour: { $gte: tunisDay(new Date(prevStart.getTime() + DAY)), $lt: dayKeys[0] } }).then((a) => a.length),
    User.countDocuments({ ...inRange('dateInscription', start, end), estSupprime: false }),
    User.countDocuments({ ...inRange('dateInscription', prevStart, start), estSupprime: false }),
    Book.countDocuments(inRange('datePublication', start, end)),
    Book.countDocuments(inRange('datePublication', prevStart, start)),
    Ride.countDocuments({ ...inRange('dateDepart', start, end), statut: { $ne: 'ANNULE' } }),
    Ride.countDocuments({ ...inRange('dateDepart', prevStart, start), statut: { $ne: 'ANNULE' } }),
    Report.countDocuments({ statut: 'EN_ATTENTE' }),
    Report.aggregate([
      { $match: { statut: { $ne: 'EN_ATTENTE' }, ...inRange('dateTraitement', start, end) } },
      { $group: { _id: null, heures: { $avg: { $divide: [{ $subtract: ['$dateTraitement', '$dateSignalement'] }, 3600 * 1000] } } } },
    ]),
    // "Most requested subjects" = subjects students declare in their profile, i.e. demand rather than supply.
    User.aggregate([{ $match: { estSupprime: false } }, { $unwind: '$matieres' }, { $group: { _id: '$matieres', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 6 }]),
    Ride.aggregate([
      { $match: { ...inRange('dateDepart', start, end), statut: { $ne: 'ANNULE' } } },
      { $group: { _id: { depart: '$lieuDepart', arrivee: '$lieuArrivee' }, trajets: { $sum: 1 }, places: { $sum: { $subtract: ['$placesTotales', '$placesDisponibles'] } } } },
      { $sort: { trajets: -1 } },
      { $limit: 5 },
    ]),
    Message.aggregate([{ $match: inRange('dateEnvoi', start, end) }, { $group: { _id: { $hour: { date: '$dateEnvoi', timezone: TIME_ZONE } }, n: { $sum: 1 } } }]),
  ]);

  const dailyMap = new Map(daily.map((d) => [d._id, d.n]));
  const hourMap = new Map(hours.map((h) => [h._id, h.n]));
  res.json({
    periode: { jours: days, debut: start, fin: end },
    kpis: {
      utilisateursActifs: { valeur: activeNow, evolution: pctChange(activeNow, activeBefore) },
      nouveauxInscrits: { valeur: signups, evolution: pctChange(signups, signupsBefore) },
      annoncesPubliees: { valeur: listings, evolution: pctChange(listings, listingsBefore) },
      trajets: { valeur: rides, evolution: pctChange(rides, ridesBefore) },
      signalementsEnAttente: { valeur: pending, delaiMoyenHeures: resolved[0] ? Math.round(resolved[0].heures * 10) / 10 : null },
    },
    actifsParJour: dayKeys.map((jour) => ({ jour, utilisateurs: dailyMap.get(jour) ?? 0 })),
    matieresDemandees: subjects.map((s) => ({ matiere: s._id, etudiants: s.n })),
    trajetsFrequents: routes.map((r) => ({ depart: r._id.depart, arrivee: r._id.arrivee, trajets: r.trajets, places: r.places })),
    activiteParHeure: Array.from({ length: 24 }, (_, h) => ({ heure: h, messages: hourMap.get(h) ?? 0 })),
  });
});

adminRouter.get(
  '/utilisateurs',
  validate(
    query('q').optional().trim().isLength({ max: 100 }),
    query('statut').optional().isIn(['tous', 'bloques', 'non-verifies', 'admins']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  ),
  async (req, res) => {
    const { q, statut = 'tous', page = 1, limit = 20 } = matchedData(req, { locations: ['query'] });
    const filter = { estSupprime: false };
    if (statut === 'bloques') filter.estBloque = true;
    if (statut === 'non-verifies') filter.emailVerifie = false;
    if (statut === 'admins') filter.role = 'ADMIN';
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ prenom: rx }, { nom: rx }, { email: rx }];
    }
    const [users, total] = await Promise.all([
      User.find(filter).select(`${publicUserFields} email emailVerifie estBloque dateInscription`).sort({ dateInscription: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments(filter),
    ]);
    res.json({ utilisateurs: users, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  },
);

async function loadTarget(req) {
  const user = await User.findOne({ _id: req.params.id, estSupprime: false });
  if (!user) throw notFound('Utilisateur introuvable.');
  if (String(user._id) === String(req.user._id)) throw badRequest('PROPRE_COMPTE', 'Vous ne pouvez pas modifier votre propre compte ici.');
  if (user.role === 'ADMIN') throw forbidden('CIBLE_ADMIN', 'Un administrateur ne peut pas être bloqué ou supprimé depuis cette page.');
  return user;
}

adminRouter.post('/utilisateurs/:id/bloquer', validate(param('id').isMongoId(), body('bloque').isBoolean().toBoolean()), async (req, res) => {
  const user = await loadTarget(req);
  user.estBloque = req.body.bloque;
  if (req.body.bloque) user.jetonVersion += 1;
  await user.save();
  if (req.body.bloque) disconnectUser(user._id);
  res.json({ utilisateur: { _id: user._id, estBloque: user.estBloque } });
});

async function cancelRidesOf(userId, reason) {
  const rides = await Ride.find({ conducteur: userId, statut: { $in: ['OUVERT', 'COMPLET'] }, dateDepart: { $gt: new Date() } });
  for (const ride of rides) {
    ride.statut = 'ANNULE';
    await ride.save();
    const passengers = await Reservation.find({ trajet: ride._id, statut: 'CONFIRMEE' }).select('passager').lean();
    await Promise.all(passengers.map((p) => notify(p.passager, { type: 'RESERVATION', contenu: `Le trajet ${ride.lieuDepart} → ${ride.lieuArrivee} a été annulé ${reason}.`, lien: `/covoiturage/${ride._id}` })));
  }
}

// Deleting anonymises the account and withdraws its content, so other students' data (groups, conversations) stays coherent.
adminRouter.delete('/utilisateurs/:id', validate(param('id').isMongoId()), async (req, res) => {
  const user = await loadTarget(req);
  await Book.updateMany({ vendeur: user._id, statut: { $ne: 'VENDUE' } }, { statut: 'MASQUEE' });
  await cancelRidesOf(user._id, 'car le compte du conducteur a été supprimé');
  for (const group of await Group.find({ 'membres.utilisateur': user._id })) {
    group.membres = group.membres.filter((m) => String(m.utilisateur) !== String(user._id));
    if (String(group.createur) === String(user._id)) {
      if (!group.membres.length) {
        await group.deleteOne();
        await Promise.all(group.documents.map((d) => removeUpload(d.url)));
        continue;
      }
      const heir = [...group.membres].sort((a, b) => a.dateAdhesion - b.dateAdhesion)[0];
      heir.role = 'CREATEUR';
      group.createur = heir.utilisateur;
    }
    await group.save();
  }
  const registrations = await Registration.find({ utilisateur: user._id }).select('evenement').lean();
  await Registration.deleteMany({ utilisateur: user._id });
  await Promise.all(registrations.map((r) => Event.updateOne({ _id: r.evenement }, { $inc: { nbInscrits: -1 } })));

  await removeUpload(user.photoUrl);
  Object.assign(user, {
    prenom: 'Compte',
    nom: 'supprimé',
    email: `supprime-${user._id}@supprime.invalid`,
    motDePasseHache: await hashPassword(randomBytes(24).toString('hex')),
    photoUrl: null,
    matieres: [],
    centresInteret: [],
    filiere: '',
    estSupprime: true,
    estBloque: true,
    jetonVersion: user.jetonVersion + 1,
  });
  await user.save();
  disconnectUser(user._id);
  res.status(204).end();
});

adminRouter.post('/categories', validate(body('nom').trim().isLength({ min: 2, max: 60 }).withMessage('Nom de 2 à 60 caractères.'), body('description').optional().trim().isLength({ max: 200 })), async (req, res) => {
  try {
    res.status(201).json({ categorie: await Category.create({ nom: req.body.nom, description: req.body.description || '' }) });
  } catch (err) {
    if (err.code === 11000) throw badRequest('VALIDATION', 'Certains champs sont invalides.', { nom: 'Cette catégorie existe déjà.' });
    throw err;
  }
});

adminRouter.patch(
  '/categories/:id',
  validate(param('id').isMongoId(), body('nom').optional().trim().isLength({ min: 2, max: 60 }), body('description').optional().trim().isLength({ max: 200 })),
  async (req, res) => {
    const cat = await Category.findById(req.params.id);
    if (!cat) throw notFound('Catégorie introuvable.');
    for (const k of ['nom', 'description']) if (req.body[k] !== undefined) cat[k] = req.body[k];
    try {
      res.json({ categorie: await cat.save() });
    } catch (err) {
      if (err.code === 11000) throw badRequest('VALIDATION', 'Certains champs sont invalides.', { nom: 'Cette catégorie existe déjà.' });
      throw err;
    }
  },
);

adminRouter.delete('/categories/:id', validate(param('id').isMongoId()), async (req, res) => {
  const used = await Book.countDocuments({ categorie: req.params.id });
  if (used) throw conflict('CATEGORIE_UTILISEE', `${used} annonce${used > 1 ? 's utilisent' : ' utilise'} cette catégorie.`);
  const { deletedCount } = await Category.deleteOne({ _id: req.params.id });
  if (!deletedCount) throw notFound('Catégorie introuvable.');
  res.status(204).end();
});

const CONTENT = {
  ANNONCE: { model: Book, auteur: 'vendeur', titre: (d) => d.titre, lien: (d) => `/livres/${d._id}` },
  TRAJET: { model: Ride, auteur: 'conducteur', titre: (d) => `${d.lieuDepart} → ${d.lieuArrivee}`, lien: (d) => `/covoiturage/${d._id}` },
  EVENEMENT: { model: Event, auteur: 'organisateur', titre: (d) => d.titre, lien: (d) => `/evenements/${d._id}` },
  MESSAGE: { model: Message, auteur: 'expediteur', titre: (d) => (d.contenu.length > 90 ? `${d.contenu.slice(0, 89)}…` : d.contenu), lien: () => null },
};

adminRouter.get(
  '/signalements',
  validate(query('statut').optional().isIn(['EN_ATTENTE', 'TRAITES']), query('page').optional().isInt({ min: 1 }).toInt()),
  async (req, res) => {
    const { statut = 'EN_ATTENTE', page = 1 } = matchedData(req, { locations: ['query'] });
    const limit = 20;
    const filter = statut === 'EN_ATTENTE' ? { statut: 'EN_ATTENTE' } : { statut: { $ne: 'EN_ATTENTE' } };
    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort(statut === 'EN_ATTENTE' ? { dateSignalement: 1 } : { dateTraitement: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('signalePar', 'prenom nom')
        .populate('traitePar', 'prenom nom')
        .lean(),
      Report.countDocuments(filter),
    ]);
    const enriched = await Promise.all(
      reports.map(async (r) => {
        const spec = CONTENT[r.typeContenu];
        const doc = await spec.model.findById(r.contenuId).populate(spec.auteur, 'prenom nom').lean();
        return { ...r, contenu: doc ? { titre: spec.titre(doc), lien: spec.lien(doc), auteur: doc[spec.auteur], statut: doc.statut ?? null } : null };
      }),
    );
    res.json({ signalements: enriched, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  },
);

async function takeDown(report) {
  const { model } = CONTENT[report.typeContenu];
  const doc = await model.findById(report.contenuId);
  if (!doc) return;
  if (report.typeContenu === 'ANNONCE') doc.statut = 'MASQUEE';
  if (report.typeContenu === 'MESSAGE') doc.contenu = '[Message retiré par la modération]';
  if (report.typeContenu === 'EVENEMENT' && doc.statut !== 'ANNULE') {
    doc.statut = 'ANNULE';
    const regs = await Registration.find({ evenement: doc._id }).select('utilisateur').lean();
    await Promise.all(regs.map((r) => notify(r.utilisateur, { type: 'RAPPEL_EVENEMENT', contenu: `« ${doc.titre} » a été retiré par la modération.`, lien: `/evenements/${doc._id}` })));
  }
  if (report.typeContenu === 'TRAJET' && ['OUVERT', 'COMPLET'].includes(doc.statut)) {
    doc.statut = 'ANNULE';
    const passengers = await Reservation.find({ trajet: doc._id, statut: 'CONFIRMEE' }).select('passager').lean();
    await Promise.all(passengers.map((p) => notify(p.passager, { type: 'RESERVATION', contenu: `Le trajet ${doc.lieuDepart} → ${doc.lieuArrivee} a été retiré par la modération.`, lien: `/covoiturage/${doc._id}` })));
  }
  await doc.save();
}

async function resolve(req, statut) {
  const report = await Report.findById(req.params.id);
  if (!report) throw notFound('Signalement introuvable.');
  if (report.statut !== 'EN_ATTENTE') throw conflict('DEJA_TRAITE', 'Ce signalement a déjà été traité.');
  if (statut === 'TRAITE') await takeDown(report);
  // Every open report about the same content is settled by the same decision.
  await Report.updateMany(
    statut === 'TRAITE' ? { typeContenu: report.typeContenu, contenuId: report.contenuId, statut: 'EN_ATTENTE' } : { _id: report._id },
    { statut, traitePar: req.user._id, dateTraitement: new Date() },
  );
  return Report.findById(report._id).lean();
}

adminRouter.post('/signalements/:id/traiter', validate(param('id').isMongoId()), async (req, res) => {
  res.json({ signalement: await resolve(req, 'TRAITE') });
});

adminRouter.post('/signalements/:id/rejeter', validate(param('id').isMongoId()), async (req, res) => {
  res.json({ signalement: await resolve(req, 'REJETE') });
});
