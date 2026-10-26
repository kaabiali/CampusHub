import { Router } from 'express';
import { Group } from '../models/Group.js';
import { Event, Registration } from '../models/Event.js';
import { Book } from '../models/Book.js';
import { Reservation } from '../models/Reservation.js';
import { Ride } from '../models/Ride.js';
import { Message } from '../models/Message.js';
import { publicUserFields } from '../models/User.js';
import { requireAuth } from '../lib/auth.js';
import { cached, rankItems, reasonFor } from '../lib/recommend.js';

export const homeRouter = Router();

const PER_KIND = 3;

async function computeRecommendations(user) {
  const now = new Date();
  const [groups, registered, events, books] = await Promise.all([
    Group.find({ 'membres.utilisateur': { $ne: user._id } }).select('nom matiere description membres capaciteMax').limit(300).lean(),
    Registration.find({ utilisateur: user._id }).select('evenement').lean(),
    Event.find({ statut: 'PUBLIE', dateDebut: { $gt: now } }).populate('club', 'nom').limit(300).lean(),
    Book.find({ statut: 'DISPONIBLE', vendeur: { $ne: user._id } }).select('titre matiere auteur prix etat photos vendeur').limit(300).lean(),
  ]);
  const mine = new Set(registered.map((r) => String(r.evenement)));
  const candidates = {
    groupes: groups.filter((g) => g.membres.length < g.capaciteMax).map((g) => ({ doc: g, texte: `${g.nom} ${g.matiere} ${g.description}` })),
    evenements: events.filter((e) => !mine.has(String(e._id))).map((e) => ({ doc: e, texte: `${e.titre} ${e.description} ${e.club?.nom ?? ''}` })),
    livres: books.map((b) => ({ doc: b, texte: `${b.titre} ${b.matiere} ${b.auteur}` })),
  };

  const out = { source: 'ml' };
  for (const [kind, list] of Object.entries(candidates)) {
    const byId = new Map(list.map((c) => [String(c.doc._id), c]));
    const { resultats, source } = await rankItems(user, list.map((c) => ({ id: String(c.doc._id), texte: c.texte })), PER_KIND);
    if (source === 'fallback') out.source = 'fallback';
    out[kind] = resultats.map((r) => {
      const { doc, texte } = byId.get(r.id);
      const { membres, ...rest } = doc;
      return { ...rest, ...(membres && { nbMembres: membres.length }), raison: reasonFor(user, texte), score: r.score };
    });
  }
  return out;
}

homeRouter.get('/recommandations', requireAuth(), async (req, res) => {
  res.json(await cached(req.user, () => computeRecommendations(req.user)));
});

homeRouter.get('/accueil', requireAuth(), async (req, res) => {
  const me = req.user._id;
  const now = new Date();
  const [annoncesActives, reservations, groupes, inscriptions, nonLus] = await Promise.all([
    Book.countDocuments({ vendeur: me, statut: 'DISPONIBLE' }),
    Reservation.find({ passager: me, statut: 'CONFIRMEE' }).select('trajet nbPlaces').lean(),
    Group.find({ 'membres.utilisateur': me }).select('nom seances').lean(),
    Registration.find({ utilisateur: me }).select('evenement').lean(),
    Message.countDocuments({ destinataire: me, lu: false }),
  ]);
  const prochainTrajet = await Ride.findOne({ _id: { $in: reservations.map((r) => r.trajet) }, statut: { $in: ['OUVERT', 'COMPLET'] }, dateDepart: { $gt: now } })
    .sort({ dateDepart: 1 })
    .populate('conducteur', publicUserFields)
    .lean();
  const prochainConduit = await Ride.findOne({ conducteur: me, statut: { $in: ['OUVERT', 'COMPLET'] }, dateDepart: { $gt: now } }).sort({ dateDepart: 1 }).lean();
  const seances = groupes
    .flatMap((g) => g.seances.filter((s) => s.date > now).map((s) => ({ ...s, groupe: { _id: g._id, nom: g.nom } })))
    .sort((a, b) => a.date - b.date);
  const prochainEvenement = await Event.findOne({ _id: { $in: inscriptions.map((i) => i.evenement) }, statut: 'PUBLIE', dateDebut: { $gt: now } })
    .sort({ dateDebut: 1 })
    .populate('club', 'nom')
    .lean();

  res.json({
    annoncesActives,
    trajetsReserves: await Ride.countDocuments({ _id: { $in: reservations.map((r) => r.trajet) }, dateDepart: { $gt: now }, statut: { $ne: 'ANNULE' } }),
    prochainTrajet,
    prochainConduit,
    nbGroupes: groupes.length,
    prochaineSeance: seances[0] || null,
    prochainEvenement,
    messagesNonLus: nonLus,
  });
});
