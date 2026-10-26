import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { Activity } from '../models/Activity.js';
import { forbidden, unauthorized } from './errors.js';
import { tunisDay } from './time.js';

export const COOKIE_NAME = 'campushub_token';
const MAX_AGE_MS = 7 * 24 * 3600 * 1000;

export const signToken = (user) => jwt.sign({ sub: String(user._id), role: user.role, v: user.jetonVersion }, config.jwtSecret, { expiresIn: '7d' });

export function setAuthCookie(res, user) {
  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax', secure: config.isProd, maxAge: MAX_AGE_MS, path: '/' });
  return token;
}

export const clearAuthCookie = (res) => res.clearCookie(COOKIE_NAME, { path: '/' });

export function readToken(req) {
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[COOKIE_NAME];
}

export async function userFromToken(token) {
  if (!token) return null;
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
  const user = await User.findById(payload.sub);
  if (!user || user.estSupprime || user.jetonVersion !== payload.v) return null;
  return user;
}

// In-memory dedupe so daily-activity upserts cost one write per user per day per process.
const seenToday = new Set();
function recordActivity(userId) {
  const jour = tunisDay();
  const key = `${userId}:${jour}`;
  if (seenToday.has(key)) return;
  if (seenToday.size > 50_000) seenToday.clear();
  seenToday.add(key);
  Activity.updateOne({ utilisateur: userId, jour }, { $setOnInsert: { utilisateur: userId, jour } }, { upsert: true }).catch(() => seenToday.delete(key));
}

export function requireAuth({ allowUnverified = false } = {}) {
  return async (req, res, next) => {
    const user = await userFromToken(readToken(req));
    if (!user) throw unauthorized();
    if (user.estBloque) throw forbidden('COMPTE_BLOQUE', 'Votre compte a été bloqué par un administrateur.');
    if (!user.emailVerifie && !allowUnverified) throw forbidden('EMAIL_NON_VERIFIE', 'Confirmez votre adresse e-mail pour continuer.');
    req.user = user;
    recordActivity(user._id);
    next();
  };
}

export async function optionalAuth(req, res, next) {
  const user = await userFromToken(readToken(req));
  if (user && !user.estBloque && user.emailVerifie) req.user = user;
  next();
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') throw forbidden('ADMIN_REQUIS', 'Réservé aux administrateurs.');
  next();
}
