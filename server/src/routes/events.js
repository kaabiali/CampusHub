import { Router } from 'express';
import mongoose from 'mongoose';
import { body, matchedData, param, query } from 'express-validator';
import { Event, Registration } from '../models/Event.js';
import { Club } from '../models/Club.js';
import { publicUserFields } from '../models/User.js';
import { requireAuth } from '../lib/auth.js';
import { validate } from '../lib/validate.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { tunisDay, formatDateFr } from '../lib/time.js';
import { notify } from '../lib/notify.js';
import { invalidateRecommendations } from '../lib/recommend.js';

export const eventsRouter = Router();

const populateEvent = (q) => q.populate('club', 'nom').populate('organisateur', publicUserFields);

async function withMyRegistrations(events, userId) {
  const mine = await Registration.find({ evenement: { $in: events.map((e) => e._id) }, utilisateur: userId }).select('evenement').lean();
  const set = new Set(mine.map((r) => String(r.evenement)));
  return events.map((e) => ({ ...e, estInscrit: set.has(String(e._id)) }));
}

async function canManage(user, clubId) {
  if (user.role === 'ADMIN') return true;
  return Boolean(await Club.exists({ _id: clubId, responsables: user._id }));
}

eventsRouter.get('/publics', async (req, res) => {
  const events = await populateEvent(Event.find({ statut: 'PUBLIE', estPublic: true, dateDebut: { $gt: new Date() } }).sort({ dateDebut: 1 }).limit(6)).lean();
  res.json({ evenements: events.map(({ organisateur, ...e }) => e) });
});

eventsRouter.get(
  '/',
  requireAuth(),
  validate(query('filtre').optional().isIn(['tous', 'mes-inscriptions', 'ce-mois']), query('page').optional().isInt({ min: 1 }).toInt(), query('limit').optional().isInt({ min: 1, max: 50 }).toInt()),
  async (req, res) => {
    const { filtre = 'tous', page = 1, limit = 12 } = matchedData(req, { locations: ['query'] });
    const now = new Date();
    const filter = { statut: 'PUBLIE', dateDebut: { $gt: now } };
    if (filtre === 'mes-inscriptions') {
      filter._id = { $in: (await Registration.find({ utilisateur: req.user._id }).select('evenement').lean()).map((r) => r.evenement) };
    }
    if (filtre === 'ce-mois') {
      const [y, m] = tunisDay(now).split('-').map(Number);
      const nextMonth = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01`;
      filter.dateDebut.$lt = new Date(`${nextMonth}T00:00:00+01:00`);
    }
    const [events, total] = await Promise.all([populateEvent(Event.find(filter).sort({ dateDebut: 1 }).skip((page - 1) * limit).limit(limit)).lean(), Event.countDocuments(filter)]);
    res.json({ evenements: await withMyRegistrations(events, req.user._id), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  },
);

eventsRouter.get('/:id', requireAuth(), validate(param('id').isMongoId()), async (req, res) => {
  const event = await populateEvent(Event.findById(req.params.id)).lean();
  if (!event) throw notFound('Événement introuvable.');
  const [withMine] = await withMyRegistrations([event], req.user._id);
  res.json({ evenement: { ...withMine, peutGerer: await canManage(req.user, event.club._id) } });
});

const eventFields = (optional) => {
  const f = (name) => (optional ? body(name).optional() : body(name));
  return [
    f('titre').trim().isLength({ min: 3, max: 120 }).withMessage('Titre de 3 à 120 caractères.'),
    f('lieu').trim().isLength({ min: 2, max: 80 }).withMessage('Indiquez le lieu.'),
    f('dateDebut')
      .isISO8601()
      .withMessage('Date invalide.')
      .bail()
      .toDate()
      .custom((d) => d.getTime() > Date.now())
      .withMessage("L'événement doit être dans le futur."),
    body('dateFin').optional({ values: 'null' }).isISO8601().withMessage('Date invalide.').toDate(),
    body('description').optional().trim().isLength({ max: 2000 }).withMessage('2000 caractères maximum.'),
    body('capacite').optional({ values: 'null' }).isInt({ min: 1, max: 5000 }).withMessage('Capacité entre 1 et 5000, ou vide pour illimitée.').toInt(),
    body('estPublic').optional().isBoolean().toBoolean(),
  ];
};

const checkEnd = (start, end) => {
  if (end && end <= start) throw badRequest('VALIDATION', 'Certains champs sont invalides.', { dateFin: 'La fin doit être après le début.' });
};

eventsRouter.post('/', requireAuth(), validate(body('club').isMongoId().withMessage('Choisissez le club.'), ...eventFields(false)), async (req, res) => {
  if (!(await canManage(req.user, req.body.club))) throw forbidden('PAS_RESPONSABLE', 'Seuls les responsables désignés de ce club peuvent publier pour lui.');
  const { club, titre, description = '', lieu, dateDebut, dateFin = null, capacite = null, estPublic = true } = req.body;
  checkEnd(dateDebut, dateFin);
  const event = await Event.create({ organisateur: req.user._id, club, titre, description, lieu, dateDebut, dateFin, capacite, estPublic });
  res.status(201).json({ evenement: await populateEvent(Event.findById(event._id)).lean() });
});

async function loadManaged(req) {
  const event = await Event.findById(req.params.id);
  if (!event) throw notFound('Événement introuvable.');
  if (!(await canManage(req.user, event.club))) throw forbidden('PAS_RESPONSABLE', 'Réservé aux responsables du club.');
  return event;
}

eventsRouter.patch('/:id', requireAuth(), validate(param('id').isMongoId(), ...eventFields(true)), async (req, res) => {
  const event = await loadManaged(req);
  if (event.statut === 'ANNULE') throw conflict('EVENEMENT_ANNULE', 'Cet événement a été annulé.');
  if (req.body.capacite !== undefined && req.body.capacite !== null && req.body.capacite < event.nbInscrits) {
    throw badRequest('VALIDATION', 'Certains champs sont invalides.', { capacite: `${event.nbInscrits} étudiants sont déjà inscrits.` });
  }
  for (const k of ['titre', 'description', 'lieu', 'dateDebut', 'dateFin', 'capacite', 'estPublic']) if (req.body[k] !== undefined) event[k] = req.body[k];
  checkEnd(event.dateDebut, event.dateFin);
  await event.save();
  res.json({ evenement: await populateEvent(Event.findById(event._id)).lean() });
});

eventsRouter.post('/:id/annuler', requireAuth(), validate(param('id').isMongoId()), async (req, res) => {
  const event = await loadManaged(req);
  event.statut = 'ANNULE';
  await event.save();
  const regs = await Registration.find({ evenement: event._id }).select('utilisateur').lean();
  await Promise.all(regs.map((r) => notify(r.utilisateur, { type: 'RAPPEL_EVENEMENT', contenu: `« ${event.titre} » prévu ${formatDateFr(event.dateDebut)} est annulé.`, lien: `/evenements/${event._id}` })));
  res.json({ evenement: event });
});

eventsRouter.get('/:id/inscrits', requireAuth(), validate(param('id').isMongoId()), async (req, res) => {
  const event = await loadManaged(req);
  const regs = await Registration.find({ evenement: event._id }).sort({ dateInscription: 1 }).populate('utilisateur', `${publicUserFields} email`).lean();
  res.json({ inscrits: regs.map((r) => ({ ...r.utilisateur, dateInscription: r.dateInscription })) });
});

eventsRouter.post('/:id/inscription', requireAuth(), validate(param('id').isMongoId()), async (req, res) => {
  const event = await mongoose.connection.transaction(async (session) => {
    const updated = await Event.findOneAndUpdate(
      { _id: req.params.id, statut: 'PUBLIE', dateDebut: { $gt: new Date() }, $or: [{ capacite: null }, { $expr: { $lt: ['$nbInscrits', '$capacite'] } }] },
      { $inc: { nbInscrits: 1 } },
      { session, returnDocument: 'after' },
    );
    if (!updated) {
      const e = await Event.findById(req.params.id).lean();
      if (!e) throw notFound('Événement introuvable.');
      if (e.statut === 'ANNULE') throw conflict('EVENEMENT_ANNULE', 'Cet événement a été annulé.');
      if (e.dateDebut <= new Date()) throw conflict('EVENEMENT_PASSE', 'Cet événement a déjà commencé.');
      throw conflict('EVENEMENT_COMPLET', 'Plus aucune place disponible.');
    }
    try {
      await Registration.create([{ evenement: updated._id, utilisateur: req.user._id }], { session });
    } catch (err) {
      if (err.code === 11000) throw conflict('DEJA_INSCRIT', 'Vous êtes déjà inscrit à cet événement.');
      throw err;
    }
    return updated;
  });
  invalidateRecommendations(req.user._id);
  res.status(201).json({ evenement: { _id: event._id, nbInscrits: event.nbInscrits, estInscrit: true } });
});

eventsRouter.delete('/:id/inscription', requireAuth(), validate(param('id').isMongoId()), async (req, res) => {
  const event = await mongoose.connection.transaction(async (session) => {
    const reg = await Registration.findOneAndDelete({ evenement: req.params.id, utilisateur: req.user._id }, { session });
    if (!reg) throw notFound("Vous n'êtes pas inscrit à cet événement.");
    return Event.findByIdAndUpdate(req.params.id, { $inc: { nbInscrits: -1 } }, { session, returnDocument: 'after' });
  });
  res.json({ evenement: { _id: event._id, nbInscrits: event.nbInscrits, estInscrit: false } });
});
