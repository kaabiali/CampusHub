import { config } from '../config.js';
import { logger } from './logger.js';

const CONDITION_FACTOR = { NEUF: 0.78, TRES_BON: 0.62, BON: 0.5, ACCEPTABLE: 0.34 };
const ML_TIMEOUT_MS = 1500;

export const mlStats = { fallbackCount: 0 };

// Deterministic heuristic used when the ML service is unavailable; it mirrors the shape the
// synthetic training data is generated from (condition factor x age decay).
export function fallbackEstimate({ etat, anneeEdition, prixNeuf }) {
  const age = Math.max(0, new Date().getFullYear() - Number(anneeEdition));
  const decay = Math.max(0.55, 1 - 0.045 * age);
  const center = Number(prixNeuf) * (CONDITION_FACTOR[etat] ?? 0.5) * decay;
  const min = Math.max(1, Math.floor(center * 0.9));
  return { min, max: Math.max(min, Math.ceil(center * 1.1)), source: 'fallback' };
}

export async function suggestPrice({ matiere = '', etat, anneeEdition, prixNeuf }) {
  try {
    const res = await fetch(`${config.mlUrl}/price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matiere, etat, anneeEdition: Number(anneeEdition), prixNeuf: Number(prixNeuf) }),
      signal: AbortSignal.timeout(ML_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`ml status ${res.status}`);
    const { min, max } = await res.json();
    return { min, max, source: 'ml' };
  } catch (err) {
    mlStats.fallbackCount += 1;
    logger.warn({ reason: err.name === 'TimeoutError' ? 'timeout' : err.message }, 'ml_fallback');
    return fallbackEstimate({ etat, anneeEdition, prixNeuf });
  }
}
