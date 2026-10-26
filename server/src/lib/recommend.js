import { config } from '../config.js';
import { logger } from './logger.js';
import { mlStats } from './pricing.js';
import { foldText } from './text.js';

const ML_TIMEOUT_MS = 1500;
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map();

const profileOf = (u) => ({ matieres: u.matieres, centresInteret: u.centresInteret, filiere: u.filiere });

// Fallback when the ML service is down: count profile words found in the item text.
function overlapRank(profile, items, k) {
  const terms = [...profile.matieres, ...profile.centresInteret].map(foldText).filter(Boolean);
  return items
    .map((i) => {
      const text = foldText(i.texte);
      return { id: i.id, score: terms.reduce((s, t) => s + (text.includes(t) ? 1 : 0), 0) };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

async function mlRank(profile, items, k) {
  const res = await fetch(`${config.mlUrl}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profil: profile, items, k }),
    signal: AbortSignal.timeout(ML_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`ml status ${res.status}`);
  return (await res.json()).resultats;
}

export async function rankItems(user, items, k) {
  const profile = profileOf(user);
  if (!items.length || (!profile.matieres.length && !profile.centresInteret.length)) return { resultats: [], source: 'vide' };
  try {
    return { resultats: await mlRank(profile, items, k), source: 'ml' };
  } catch (err) {
    mlStats.fallbackCount += 1;
    logger.warn({ reason: err.name === 'TimeoutError' ? 'timeout' : err.message }, 'ml_fallback');
    return { resultats: overlapRank(profile, items, k), source: 'fallback' };
  }
}

// Why an item was suggested, phrased for the student.
export function reasonFor(user, texte) {
  const text = foldText(texte);
  const subject = user.matieres.find((m) => text.includes(foldText(m)));
  if (subject) return `Vous suivez ${subject}`;
  const matchesWord = (phrase) => foldText(phrase).split(' ').some((w) => w.length > 3 && text.includes(w));
  const interest = user.centresInteret.find(matchesWord);
  if (interest) return `Centre d’intérêt : ${interest}`;
  return user.filiere && matchesWord(user.filiere) ? `Lié à votre filière (${user.filiere})` : 'Proche de votre profil';
}

export function cached(user, compute) {
  const key = `${user._id}:${foldText([...user.matieres, '|', ...user.centresInteret, '|', user.filiere].join(' '))}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = compute();
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
  // Failed computations shouldn't stick in the cache.
  value.catch(() => cache.delete(key));
  if (cache.size > 2000) cache.delete(cache.keys().next().value);
  return value;
}

// Joining a group or registering for an event changes what should be suggested.
export function invalidateRecommendations(userId) {
  const prefix = `${userId}:`;
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
}
