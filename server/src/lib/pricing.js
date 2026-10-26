const CONDITION_FACTOR = { NEUF: 0.78, TRES_BON: 0.62, BON: 0.5, ACCEPTABLE: 0.34 };

// Deterministic heuristic used when the ML service is unavailable; it mirrors the shape the
// synthetic training data is generated from (condition factor x age decay).
export function fallbackEstimate({ etat, anneeEdition, prixNeuf }) {
  const age = Math.max(0, new Date().getFullYear() - Number(anneeEdition));
  const decay = Math.max(0.55, 1 - 0.045 * age);
  const center = Number(prixNeuf) * (CONDITION_FACTOR[etat] ?? 0.5) * decay;
  return toRange(center, 'fallback');
}

export function toRange(center, source) {
  const min = Math.max(1, Math.floor(center * 0.9));
  const max = Math.max(min, Math.ceil(center * 1.1));
  return { min, max, source };
}

export async function suggestPrice(input) {
  return fallbackEstimate(input);
}
