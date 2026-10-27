import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { body } from 'express-validator';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { validate, isStrongPassword, PASSWORD_RULE_MSG } from '../lib/validate.js';
import { clearAuthCookie, readToken, requireAuth, setAuthCookie, userFromToken } from '../lib/auth.js';
import { badRequest, AppError, forbidden } from '../lib/errors.js';
import { createEmailToken, hashToken } from '../lib/tokens.js';
import { sendMail } from '../lib/mailer.js';
import { hashPassword, verifyPassword } from '../lib/passwords.js';

export const authRouter = Router();

const VERIFY_TTL = 24 * 3600 * 1000;
const RESET_TTL = 3600 * 1000;

const googleClient = new OAuth2Client();
const googleName = (value, fallback) => String(value || fallback || '').trim().slice(0, 50) || fallback;

const limiter = (options) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => config.isTest,
    handler: (req, res) => res.status(429).json({ error: { code: 'TROP_DE_TENTATIVES', message: 'Trop de tentatives. Réessayez dans 15 minutes.' } }),
    ...options,
  });

const emailKey = (req) => String(req.body?.email || req.user?.email || '').trim().toLowerCase();

// Students share the campus NAT address, so limits are keyed per account, with a loose per-IP backstop.
const ipBackstop = limiter({ limit: 100 });
const loginLimiter = limiter({ limit: 10, skipSuccessfulRequests: true, keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${emailKey(req)}` });
const mailLimiter = limiter({ limit: 5, keyGenerator: (req) => `mail:${emailKey(req)}` });

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
  ipBackstop,
  mailLimiter,
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
  '/google',
  ipBackstop,
  validate(body('credential').isString().notEmpty().withMessage('Jeton Google manquant.')),
  async (req, res) => {
    if (!config.googleClientId) {
      throw new AppError(503, 'GOOGLE_NON_CONFIGURE', 'La connexion avec Google n’est pas encore configurée.');
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: req.body.credential, audience: config.googleClientId });
      payload = ticket.getPayload();
    } catch {
      throw new AppError(401, 'JETON_GOOGLE_INVALIDE', 'La connexion Google a expiré ou n’est pas valide. Réessayez.');
    }

    const email = String(payload?.email || '').trim().toLowerCase();
    // Google sign-in accepts every verified Google account; only the e-mail signup keeps the @campus.tn rule.
    if (!email || !payload?.email_verified) {
      throw forbidden('EMAIL_GOOGLE_NON_VERIFIE', 'Google n’a pas pu vérifier cette adresse. Réessayez avec un autre compte.');
    }

    let user = await User.findOne({ email });
    if (user?.estSupprime) throw forbidden('COMPTE_INDISPONIBLE', 'Ce compte n’est plus disponible.');
    if (user?.estBloque) throw forbidden('COMPTE_BLOQUE', 'Votre compte a été bloqué par un administrateur.');

    if (!user) {
      user = await User.create({
        prenom: googleName(payload.given_name, email.split('@')[0]),
        nom: googleName(payload.family_name, 'Campus'),
        email,
        // Google accounts sign in with Google, but a random hash keeps the password field unusable.
        motDePasseHache: await hashPassword(randomBytes(32).toString('hex')),
        googleId: payload.sub,
        emailVerifie: true,
      });
    } else {
      // Google already verified this address, so linking it and confirming the account is safe.
      user.googleId = payload.sub;
      user.emailVerifie = true;
      await user.save();
    }

    setAuthCookie(res, user);
    res.json({ utilisateur: user });
  },
);

authRouter.post(
  '/connexion',
  ipBackstop,
  loginLimiter,
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

// "Who am I" is a question, not a protected resource: guests get null instead of a 401
// so every anonymous page load doesn't log an error in the browser console.
authRouter.get('/moi', async (req, res) => {
  const user = await userFromToken(readToken(req));
  res.json({ utilisateur: user && !user.estBloque ? user : null });
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

authRouter.post('/renvoyer-verification', ipBackstop, requireAuth({ allowUnverified: true }), mailLimiter, async (req, res) => {
  if (req.user.emailVerifie) return res.json({ mailEnvoye: false, dejaVerifie: true });
  res.json({ mailEnvoye: await sendVerification(req.user) });
});

authRouter.post('/mot-de-passe-oublie', ipBackstop, mailLimiter, validate(body('email').trim().toLowerCase().isEmail().withMessage('Adresse e-mail invalide.')), async (req, res) => {
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
  ipBackstop,
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
