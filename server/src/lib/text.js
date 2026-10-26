export const foldText = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Every typed term must appear somewhere (prefix-friendly, accent- and case-insensitive).
export function searchFilter(field, q) {
  const terms = foldText(q).split(' ').filter(Boolean).slice(0, 8);
  return terms.length ? { $and: terms.map((t) => ({ [field]: { $regex: escapeRegex(t) } })) } : {};
}
