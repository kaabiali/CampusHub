import { Router } from 'express';
import mongoose from 'mongoose';
import { body, matchedData, param, query } from 'express-validator';
import { Ride } from '../models/Ride.js';
import { Reservation } from '../models/Reservation.js';
import { Rating, refreshDriverRating } from '../models/Rating.js';
import { publicUserFields } from '../models/User.js';
import { requireAuth } from '../lib/auth.js';
import { validate } from '../lib/validate.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { searchFilter } from '../lib/text.js';
import { formatDateFr, tunisDayRange } from '../lib/time.js';
import { notify } from '../lib/notify.js';

export const ridesRouter = Router();

const MIN_LEAD_MS = 10 * 60 * 1000;
const MAX_AHEAD_MS = 60 * 24 * 3600 * 1000;
const RATING_WINDOW_MS = 7 * 24 * 3600 * 1000;

const rideLabel = (r) => `${r.lieuDepart} → ${r.lieuArrivee}, ${formatDateFr(r.dateDepart)}`;

async function attachMyReservations(rides, userId) {
  const mine = await Reservation.find({ trajet: { $in: rides.map((r) => r._id) }, passager: userId, statut: 'CONFIRMEE' }).lean();
  const byRide = new Map(mine.map((r) => [String(r.trajet), r]));
  return rides.map((r) => ({ ...r, maReservation: byRide.get(String(r._id)) || null }));
}

ridesRouter.get(
  '/',
  requireAuth(),
  validate(
    query('depart').optional().trim().isLength({ max: 80 }),
    query('arrivee').optional().trim().isLength({ max: 80 }),
    query('date').optional().isISO8601({ strict: true }).isLength({ min: 10, max: 10 }),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  ),
  async (req, res) => {
    const { depart, arrivee, date, page = 1, limit = 20 } = matchedData(req, { locations: ['query'] });
    const now = new Date();
    const filter = { statut: { $in: ['OUVERT', 'COMPLET'] }, dateDepart: { $gt: now } };
    if (date) {
      const { start, end } = tunisDayRange(date);
      filter.dateDepart = { $gt: start > now ? start : now, $lt: end };
    }
    const terms = [depart, arrivee].filter(Boolean).join(' ');
    if (terms) Object.assign(filter, searchFilter('recherche', terms));

    const [rides, total] = await Promise.all([
      Ride.find(filter).sort({ dateDepart: 1 }).skip((page - 1) * limit).limit(limit).populate('conducteur', publicUserFields).lean(),
      Ride.countDocuments(filter),
    ]);
    res.json({ trajets: await attachMyReservations(rides, req.user._id), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  },
);

ridesRouter.get('/mes-trajets', requireAuth(), async (req, res) => {
  const [conduits, reservations] = await Promise.all([
    Ride.find({ conducteur: req.user._id }).sort({ dateDepart: -1 }).limit(50).lean(),
    Reservation.find({ passager: req.user._id, statut: 'CONFIRMEE' })
      .sort({ dateReservation: -1 })
      .limit(50)
      .populate({ path: 'trajet', populate: { path: 'conducteur', select: publicUserFields } })
      .lean(),
  ]);
  const rated = new Set((await Rating.find({ reservation: { $in: reservations.map((r) => r._id) } }).select('reservation').lean()).map((a) => String(a.reservation)));
  res.json({ conduits, reservations: reservations.filter((r) => r.trajet).map((r) => ({ ...r, avisDonne: rated.has(String(r._id)) })) });
});

ridesRouter.get('/:id', requireAuth(), validate(param('id').isMongoId()), async (req, res) => {
  const ride = await Ride.findById(req.params.id).populate('conducteur', publicUserFields).lean();
  if (!ride) throw notFound('Trajet introuvable.');
  const passagers = await Reservation.find({ trajet: ride._id, statut: 'CONFIRMEE' }).populate('passager', publicUserFields).lean();
  const maReservation = passagers.find((p) => String(p.passager._id) === String(req.user._id)) || null;
  const monAvis = maReservation ? await Rating.findOne({ reservation: maReservation._id }).lean() : null;
  res.json({ trajet: { ...ride, passagers: passagers.map((p) => ({ ...p.passager, nbPlaces: p.nbPlaces })), maReservation, monAvis } });
});

const rideFields = (optional) => {
  const f = (name) => (optional ? body(name).optional() : body(name));
  return [
    f('lieuDepart').trim().isLength({ min: 2, max: 80 }).withMessage('Indiquez le lieu de départ.'),
    f('lieuArrivee').trim().isLength({ min: 2, max: 80 }).withMessage("Indiquez le lieu d'arrivée."),
    f('dateDepart')
      .isISO8601()
      .withMessage('Date invalide.')
      .bail()
      .toDate()
      .custom((d) => d.getTime() > Date.now() + MIN_LEAD_MS && d.getTime() < Date.now() + MAX_AHEAD_MS)
      .withMessage('Le départ doit être dans au moins 10 minutes et au plus 60 jours.'),
    f('placesTotales').isInt({ min: 1, max: 6 }).withMessage('Entre 1 et 6 places.').toInt(),
    f('prix').isFloat({ min: 0, max: 50 }).withMessage('Prix entre 0 et 50 DT.').toFloat(),
    body('dureeMinutes').optional({ values: 'null' }).isInt({ min: 5, max: 240 }).withMessage('Durée entre 5 et 240 minutes.').toInt(),
    body('vehicule').optional().trim().isLength({ max: 60 }),
    body('details').optional().trim().isLength({ max: 300 }).withMessage('300 caractères maximum.'),
  ];
};

ridesRouter.post('/', requireAuth(), validate(...rideFields(false)), async (req, res) => {
  const { lieuDepart, lieuArrivee, dateDepart, placesTotales, prix, dureeMinutes = null, vehicule = '', details = '' } = req.body;
  const ride = await Ride.create({ conducteur: req.user._id, lieuDepart, lieuArrivee, dateDepart, placesTotales, placesDisponibles: placesTotales, prix, dureeMinutes, vehicule, details });
  res.status(201).json({ trajet: ride });
});

async function loadDriven(req, session) {
  const ride = await Ride.findById(req.params.id).session(session);
  if (!ride) throw notFound('Trajet introuvable.');
  if (String(ride.conducteur) !== String(req.user._id)) throw forbidden('PAS_CONDUCTEUR', 'Seul le conducteur peut modifier ce trajet.');
  if (!['OUVERT', 'COMPLET'].includes(ride.statut) || ride.dateDepart < new Date()) throw conflict('TRAJET_FIGE', 'Ce trajet est passé ou annulé.');
  return ride;
}

ridesRouter.patch('/:id', requireAuth(), validate(param('id').isMongoId(), ...rideFields(true)), async (req, res) => {
  const ride = await mongoose.connection.transaction(async (session) => {
    const r = await loadDriven(req, session);
    const booked = r.placesTotales - r.placesDisponibles;
    if (req.body.placesTotales !== undefined && req.body.placesTotales < booked) {
      throw badRequest('VALIDATION', 'Certains champs sont invalides.', { placesTotales: `${booked} places sont déjà réservées.` });
    }
    for (const k of ['lieuDepart', 'lieuArrivee', 'dateDepart', 'prix', 'dureeMinutes', 'vehicule', 'details']) if (req.body[k] !== undefined) r[k] = req.body[k];
    if (req.body.placesTotales !== undefined) {
      r.placesTotales = req.body.placesTotales;
      r.placesDisponibles = req.body.placesTotales - booked;
    }
    r.statut = r.placesDisponibles === 0 ? 'COMPLET' : 'OUVERT';
    return r.save({ session });
  });
  res.json({ trajet: ride });
});

ridesRouter.post('/:id/annuler', requireAuth(), validate(param('id').isMongoId()), async (req, res) => {
  const ride = await loadDriven(req);
  ride.statut = 'ANNULE';
  await ride.save();
  const passengers = await Reservation.find({ trajet: ride._id, statut: 'CONFIRMEE' }).select('passager').lean();
  await Promise.all(
    passengers.map((p) => notify(p.passager, { type: 'RESERVATION', contenu: `Le trajet ${rideLabel(ride)} a été annulé par le conducteur.`, lien: `/covoiturage/${ride._id}` })),
  );
  res.json({ trajet: ride });
});

async function explainUnavailable(rideId, userId, n) {
  const ride = await Ride.findById(rideId).lean();
  if (!ride) return notFound('Trajet introuvable.');
  if (String(ride.conducteur) === String(userId)) return badRequest('PROPRE_TRAJET', 'Vous ne pouvez pas réserver votre propre trajet.');
  if (ride.statut === 'ANNULE') return conflict('TRAJET_ANNULE', 'Ce trajet a été annulé.');
  if (ride.statut === 'TERMINE' || ride.dateDepart <= new Date()) return conflict('TRAJET_PASSE', 'Ce trajet est déjà parti.');
  if (ride.placesDisponibles === 0) return conflict('TRAJET_COMPLET', 'Ce trajet est complet.');
  return conflict('PLACES_INSUFFISANTES', `Il ne reste que ${ride.placesDisponibles} place${ride.placesDisponibles > 1 ? 's' : ''}.`);
}

ridesRouter.post(
  '/:id/reservations',
  requireAuth(),
  validate(param('id').isMongoId(), body('nbPlaces').optional().isInt({ min: 1, max: 6 }).withMessage('Entre 1 et 6 places.').toInt()),
  async (req, res) => {
    const n = req.body.nbPlaces ?? 1;
    const { ride, reservation } = await mongoose.connection.transaction(async (session) => {
      const updated = await Ride.findOneAndUpdate(
        { _id: req.params.id, statut: 'OUVERT', conducteur: { $ne: req.user._id }, dateDepart: { $gt: new Date() }, placesDisponibles: { $gte: n } },
        { $inc: { placesDisponibles: -n } },
        { session, returnDocument: 'after' },
      );
      if (!updated) throw await explainUnavailable(req.params.id, req.user._id, n);
      let created;
      try {
        [created] = await Reservation.create([{ trajet: updated._id, passager: req.user._id, nbPlaces: n }], { session });
      } catch (err) {
        if (err.code === 11000) throw conflict('DEJA_RESERVE', 'Vous avez déjà une réservation sur ce trajet.');
        throw err;
      }
      if (updated.placesDisponibles === 0) {
        updated.statut = 'COMPLET';
        await updated.save({ session });
      }
      return { ride: updated, reservation: created };
    });
    await notify(ride.conducteur, {
      type: 'RESERVATION',
      contenu: `${req.user.prenom} ${req.user.nom} a réservé ${n > 1 ? `${n} places` : 'une place'} sur votre trajet ${rideLabel(ride)}.`,
      lien: `/covoiturage/${ride._id}`,
    });
    res.status(201).json({ reservation, trajet: ride });
  },
);

export const reservationsRouter = Router();

reservationsRouter.delete('/:id', requireAuth(), validate(param('id').isMongoId()), async (req, res) => {
  const ride = await mongoose.connection.transaction(async (session) => {
    const reservation = await Reservation.findOneAndUpdate(
      { _id: req.params.id, passager: req.user._id, statut: 'CONFIRMEE' },
      { statut: 'ANNULEE', dateAnnulation: new Date() },
      { session, returnDocument: 'after' },
    );
    if (!reservation) throw notFound('Réservation introuvable ou déjà annulée.');
    const r = await Ride.findById(reservation.trajet).session(session);
    if (r.dateDepart <= new Date()) throw conflict('TRAJET_PASSE', 'Le trajet est déjà parti.');
    r.placesDisponibles += reservation.nbPlaces;
    if (r.statut === 'COMPLET') r.statut = 'OUVERT';
    return r.save({ session });
  });
  await notify(ride.conducteur, {
    type: 'RESERVATION',
    contenu: `${req.user.prenom} ${req.user.nom} a annulé sa réservation sur votre trajet ${rideLabel(ride)}.`,
    lien: `/covoiturage/${ride._id}`,
  });
  res.json({ trajet: ride });
});

reservationsRouter.post(
  '/:id/avis',
  requireAuth(),
  validate(
    param('id').isMongoId(),
    body('note').isInt({ min: 1, max: 5 }).withMessage('Note entre 1 et 5.').toInt(),
    body('commentaire').optional().trim().isLength({ max: 300 }).withMessage('300 caractères maximum.'),
  ),
  async (req, res) => {
    const reservation = await Reservation.findOne({ _id: req.params.id, passager: req.user._id, statut: 'CONFIRMEE' }).populate('trajet');
    if (!reservation?.trajet) throw notFound('Réservation introuvable.');
    const ride = reservation.trajet;
    const elapsed = Date.now() - ride.dateDepart.getTime();
    if (ride.statut === 'ANNULE' || elapsed < 0) throw conflict('AVIS_TROP_TOT', 'Vous pourrez noter le conducteur après le trajet.');
    if (elapsed > RATING_WINDOW_MS) throw conflict('AVIS_EXPIRE', 'Le délai de 7 jours pour noter ce trajet est dépassé.');
    let avis;
    try {
      avis = await Rating.create({ reservation: reservation._id, trajet: ride._id, auteur: req.user._id, conducteur: ride.conducteur, note: req.body.note, commentaire: req.body.commentaire || '' });
    } catch (err) {
      if (err.code === 11000) throw conflict('AVIS_DEJA_DONNE', 'Vous avez déjà noté ce trajet.');
      throw err;
    }
    await refreshDriverRating(ride.conducteur);
    res.status(201).json({ avis });
  },
);
