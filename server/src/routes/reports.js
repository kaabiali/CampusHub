import { Router } from 'express';
import { body } from 'express-validator';
import { Report, TYPES_CONTENU } from '../models/Report.js';
import { Book } from '../models/Book.js';
import { Ride } from '../models/Ride.js';
import { Event } from '../models/Event.js';
import { requireAuth } from '../lib/auth.js';
import { validate } from '../lib/validate.js';
import { badRequest, notFound } from '../lib/errors.js';

export const reportsRouter = Router();

// Each reportable type maps to its model and the field holding its author; modules register here.
export const REPORTABLE = {
  ANNONCE: { model: Book, auteur: 'vendeur' },
  TRAJET: { model: Ride, auteur: 'conducteur' },
  EVENEMENT: { model: Event, auteur: 'organisateur' },
};

reportsRouter.post(
  '/',
  requireAuth(),
  validate(
    body('typeContenu').isIn(TYPES_CONTENU).withMessage('Type de contenu inconnu.'),
    body('contenuId').isMongoId().withMessage('Contenu invalide.'),
    body('motif').trim().isLength({ min: 5, max: 300 }).withMessage('Décrivez le problème (5 à 300 caractères).'),
  ),
  async (req, res) => {
    const { typeContenu, contenuId, motif } = req.body;
    const target = REPORTABLE[typeContenu];
    if (!target) throw badRequest('TYPE_NON_SIGNALABLE', 'Ce type de contenu ne peut pas encore être signalé.');
    const content = await target.model.findById(contenuId).select(target.auteur).lean();
    if (!content) throw notFound('Contenu introuvable.');
    if (String(content[target.auteur]) === String(req.user._id)) throw badRequest('PROPRE_CONTENU', 'Vous ne pouvez pas signaler votre propre contenu.');
    try {
      await Report.create({ typeContenu, contenuId, motif, signalePar: req.user._id });
    } catch (err) {
      if (err.code !== 11000) throw err;
    }
    res.status(201).json({ ok: true });
  },
);
