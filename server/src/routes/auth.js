import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { validate, isStrongPassword, PASSWORD_RULE_MSG } from '../lib/validate.js';
import { clearAuthCookie, requireAuth, setAuthCookie } from '../lib/auth.js';
import { badRequest, AppError } from '../lib/errors.js';
import { createEmailToken, hashToken } from '../lib/tokens.js';
import { sendMail } from '../lib/mailer.js';
import { hashPassword, verifyPassword } from '../lib/passwords.js';

export const authRouter = Router();

const VERIFY_TTL = 24 * 3600 * 1000;
const RESET_TTL = 3600 * 1000;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => config.isTest,
  handler: (req, res) => res.status(429).json({ error: { code: 'TROP_DE_TENTATIVES', message: 'Trop de tentatives. Réessayez dans 15 minutes.' } }),
});

const campusEmail = () =>
  body('email')
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Adresse e-mail invalide.')
    .bail()
    .custom((v) => v.endsWith(`@${config.emailDomain}`))
    .withMessage(`Utilisez votre adresse universitaire (@${config.emailDomain}).`);

async function sendVerification(user) {
  const { token, stored } = createEmailToken(VERIFY_TTL);
  user.jetonVerification = stored;
  await user.save();
  return sendMail({
    to: user.email,
    sujet: 'Confirmez votre adresse e-mail',
    titre: `Bienvenue sur CampusHub, ${user.prenom}`,
    texte: 'Confirmez votre adresse universitaire pour accéder aux livres, trajets, groupes et événements du campus. Le lien est valable 24 heures.',
    bouton: 'Confirmer mon adresse',
    lien: `${config.clientUrl}/verifier-email?jeton=${token}`,
  });
}

authRouter.post(
  '/inscription',
  authLimiter,
  validate(
    body('prenom').trim().isLength({ min: 1, max: 50 }).withMessage('Indiquez votre prénom.'),
    body('nom').trim().isLength({ min: 1, max: 50 }).withMessage('Indiquez votre nom.'),
    campusEmail(),
    body('motDePasse').custom(isStrongPassword).withMessage(PASSWORD_RULE_MSG),
    body('filiere').optional().trim().isLength({ max: 80 }),
    body('niveau').optional().trim().isLength({ max: 40 }),
  ),
  async (req, res) => {
    const { prenom, nom, email, motDePasse, filiere = '', niveau = '' } = req.body;
    if (await User.exists({ email })) {
      throw badRequest('VALIDATION', 'Certains champs sont invalides.', { email: 'Un compte existe déjà avec cette adresse.' });
    }
    const user = await User.create({ prenom, nom, email, filiere, niveau, motDePasseHache: await hashPassword(motDePasse) });
    const mailEnvoye = await sendVerification(user);
    setAuthCookie(res, user);
    res.status(201).json({ utilisateur: user, mailEnvoye });
  },
);

authRouter.post(
  '/connexion',
  authLimiter,
  validate(body('email').trim().toLowerCase().isEmail().withMessage('Adresse e-mail invalide.'), body('motDePasse').isString().notEmpty().withMessage('Indiquez votre mot de passe.')),
  async (req, res) => {
    const user = await User.findOne({ email: req.body.email, estSupprime: false });
    const ok = user && (await verifyPassword(req.body.motDePasse, user.motDePasseHache));
    if (!ok) throw new AppError(401, 'IDENTIFIANTS_INVALIDES', 'E-mail ou mot de passe incorrect.');
    if (user.estBloque) throw new AppError(403, 'COMPTE_BLOQUE', 'Votre compte a été bloqué par un administrateur.');
    setAuthCookie(res, user);
    res.json({ utilisateur: user });
  },
);

authRouter.post('/deconnexion', (req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

authRouter.get('/moi', requireAuth({ allowUnverified: true }), (req, res) => {
  res.json({ utilisateur: req.user });
});

authRouter.post('/verifier', validate(body('jeton').isString().notEmpty()), async (req, res) => {
  const user = await User.findOne({ 'jetonVerification.hash': hashToken(req.body.jeton) });
  if (!user || user.jetonVerification.expire < new Date()) {
    throw badRequest('JETON_INVALIDE', 'Ce lien de confirmation est invalide ou a expiré. Demandez-en un nouveau.');
  }
  user.emailVerifie = true;
  user.jetonVerification = null;
  await user.save();
  setAuthCookie(res, user);
  res.json({ utilisateur: user });
});

authRouter.post('/renvoyer-verification', authLimiter, requireAuth({ allowUnverified: true }), async (req, res) => {
  if (req.user.emailVerifie) return res.json({ mailEnvoye: false, dejaVerifie: true });
  res.json({ mailEnvoye: await sendVerification(req.user) });
});

authRouter.post('/mot-de-passe-oublie', authLimiter, validate(body('email').trim().toLowerCase().isEmail().withMessage('Adresse e-mail invalide.')), async (req, res) => {
  const user = await User.findOne({ email: req.body.email, estSupprime: false, estBloque: false });
  if (user) {
    const { token, stored } = createEmailToken(RESET_TTL);
    user.jetonReset = stored;
    await user.save();
    await sendMail({
      to: user.email,
      sujet: 'Réinitialisation de votre mot de passe',
      titre: 'Choisissez un nouveau mot de passe',
      texte: "Quelqu'un a demandé la réinitialisation du mot de passe de votre compte CampusHub. Si ce n'est pas vous, ignorez ce message. Le lien est valable 1 heure.",
      bouton: 'Choisir un nouveau mot de passe',
      lien: `${config.clientUrl}/reinitialiser?jeton=${token}`,
    });
  }
  // Same response whether or not the account exists, so the endpoint can't be used to enumerate students.
  res.json({ ok: true });
});

authRouter.post(
  '/reinitialiser',
  authLimiter,
  validate(body('jeton').isString().notEmpty(), body('motDePasse').custom(isStrongPassword).withMessage(PASSWORD_RULE_MSG)),
  async (req, res) => {
    const user = await User.findOne({ 'jetonReset.hash': hashToken(req.body.jeton) });
    if (!user || user.jetonReset.expire < new Date()) {
      throw badRequest('JETON_INVALIDE', 'Ce lien de réinitialisation est invalide ou a expiré. Faites une nouvelle demande.');
    }
    user.motDePasseHache = await hashPassword(req.body.motDePasse);
    user.jetonReset = null;
    // Clicking the emailed link proves ownership of the address.
    user.emailVerifie = true;
    user.jetonVersion += 1;
    await user.save();
    setAuthCookie(res, user);
    res.json({ utilisateur: user });
  },
);
