import { Router } from 'express';
import { body, param } from 'express-validator';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { User, publicUserFields } from '../models/User.js';
import { requireAuth, setAuthCookie } from '../lib/auth.js';
import { validate, isStrongPassword, PASSWORD_RULE_MSG } from '../lib/validate.js';
import { badRequest, notFound } from '../lib/errors.js';
import { hashPassword, verifyPassword } from '../lib/passwords.js';
import { avatarUpload, publicUrl, uploadsRoot } from '../lib/upload.js';

export const usersRouter = Router();

const tagList = (field) =>
  body(field)
    .optional()
    .isArray({ max: 20 })
    .withMessage('20 éléments maximum.')
    .customSanitizer((arr) => [...new Set(arr.map((s) => String(s).trim()).filter(Boolean).map((s) => s.slice(0, 40)))]);

usersRouter.patch(
  '/moi',
  requireAuth(),
  validate(
    body('prenom').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Indiquez votre prénom.'),
    body('nom').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Indiquez votre nom.'),
    body('filiere').optional().trim().isLength({ max: 80 }),
    body('niveau').optional().trim().isLength({ max: 40 }),
    tagList('matieres'),
    tagList('centresInteret'),
  ),
  async (req, res) => {
    for (const key of ['prenom', 'nom', 'filiere', 'niveau', 'matieres', 'centresInteret']) {
      if (req.body[key] !== undefined) req.user[key] = req.body[key];
    }
    await req.user.save();
    res.json({ utilisateur: req.user });
  },
);

async function removeUpload(url) {
  if (!url?.startsWith('/uploads/')) return;
  await unlink(join(uploadsRoot, url.slice('/uploads/'.length))).catch(() => {});
}

usersRouter.post('/moi/photo', requireAuth(), avatarUpload.single('photo'), async (req, res) => {
  if (!req.file) throw badRequest('FICHIER_MANQUANT', 'Ajoutez une image.');
  const previous = req.user.photoUrl;
  req.user.photoUrl = publicUrl(req.file);
  await req.user.save();
  await removeUpload(previous);
  res.json({ utilisateur: req.user });
});

usersRouter.patch(
  '/moi/mot-de-passe',
  requireAuth(),
  validate(body('actuel').isString().notEmpty().withMessage('Indiquez votre mot de passe actuel.'), body('nouveau').custom(isStrongPassword).withMessage(PASSWORD_RULE_MSG)),
  async (req, res) => {
    if (!(await verifyPassword(req.body.actuel, req.user.motDePasseHache))) {
      throw badRequest('VALIDATION', 'Certains champs sont invalides.', { actuel: 'Mot de passe actuel incorrect.' });
    }
    req.user.motDePasseHache = await hashPassword(req.body.nouveau);
    req.user.jetonVersion += 1;
    await req.user.save();
    setAuthCookie(res, req.user);
    res.json({ ok: true });
  },
);

usersRouter.get('/:id', requireAuth(), validate(param('id').isMongoId()), async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, estSupprime: false }).select(publicUserFields).lean();
  if (!user) throw notFound('Utilisateur introuvable.');
  res.json({ utilisateur: user });
});
