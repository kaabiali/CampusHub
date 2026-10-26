import { Router } from 'express';
import { body, param } from 'express-validator';
import { Club } from '../models/Club.js';
import { Event } from '../models/Event.js';
import { User, publicUserFields } from '../models/User.js';
import { requireAdmin, requireAuth } from '../lib/auth.js';
import { validate } from '../lib/validate.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';

export const clubsRouter = Router();

clubsRouter.get('/', requireAuth(), async (req, res) => {
  res.json({ clubs: await Club.find().sort({ nom: 1 }).populate('responsables', `${publicUserFields} email`).lean() });
});

clubsRouter.get('/mes-clubs', requireAuth(), async (req, res) => {
  const filter = req.user.role === 'ADMIN' ? {} : { responsables: req.user._id };
  res.json({ clubs: await Club.find(filter).sort({ nom: 1 }).select('nom').lean() });
});

const clubFields = (optional) => [
  (optional ? body('nom').optional() : body('nom')).trim().isLength({ min: 2, max: 60 }).withMessage('Nom de 2 à 60 caractères.'),
  body('description').optional().trim().isLength({ max: 300 }),
];

clubsRouter.post('/', requireAuth(), requireAdmin, validate(...clubFields(false)), async (req, res) => {
  try {
    res.status(201).json({ club: await Club.create({ nom: req.body.nom, description: req.body.description || '' }) });
  } catch (err) {
    if (err.code === 11000) throw badRequest('VALIDATION', 'Certains champs sont invalides.', { nom: 'Un club porte déjà ce nom.' });
    throw err;
  }
});

clubsRouter.patch('/:id', requireAuth(), requireAdmin, validate(param('id').isMongoId(), ...clubFields(true)), async (req, res) => {
  const club = await Club.findById(req.params.id);
  if (!club) throw notFound('Club introuvable.');
  for (const k of ['nom', 'description']) if (req.body[k] !== undefined) club[k] = req.body[k];
  res.json({ club: await club.save() });
});

clubsRouter.put(
  '/:id/responsables',
  requireAuth(),
  requireAdmin,
  validate(param('id').isMongoId(), body('emails').isArray({ max: 10 }).withMessage('10 responsables maximum.'), body('emails.*').trim().toLowerCase().isEmail()),
  async (req, res) => {
    const club = await Club.findById(req.params.id);
    if (!club) throw notFound('Club introuvable.');
    const users = await User.find({ email: { $in: req.body.emails }, estSupprime: false }).select('_id email').lean();
    const missing = req.body.emails.filter((e) => !users.some((u) => u.email === e));
    if (missing.length) throw badRequest('VALIDATION', 'Certains champs sont invalides.', { emails: `Aucun compte pour : ${missing.join(', ')}` });
    club.responsables = users.map((u) => u._id);
    await club.save();
    res.json({ club: await Club.findById(club._id).populate('responsables', `${publicUserFields} email`).lean() });
  },
);

clubsRouter.delete('/:id', requireAuth(), requireAdmin, validate(param('id').isMongoId()), async (req, res) => {
  if (await Event.exists({ club: req.params.id })) throw conflict('CLUB_UTILISE', 'Ce club a des événements ; supprimez-les ou annulez-les d’abord.');
  const { deletedCount } = await Club.deleteOne({ _id: req.params.id });
  if (!deletedCount) throw notFound('Club introuvable.');
  res.status(204).end();
});
