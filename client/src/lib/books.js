export const ETAT_LABELS = { NEUF: 'Neuf', TRES_BON: 'Très bon', BON: 'Bon', ACCEPTABLE: 'Acceptable' };
export const ETATS = Object.keys(ETAT_LABELS);

const COVER_COLORS = ['#1e2a4a', '#0049db', '#3f5e4b', '#7a3b2e', '#4b4f58', '#0f5c66', '#2e2a4f', '#8a5a12'];

export function coverColor(seed = '') {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return COVER_COLORS[h % COVER_COLORS.length];
}

export function coverLabel(book) {
  return (book.matiere || book.titre).toUpperCase().slice(0, 28);
}

export function priceVerdict(book) {
  const s = book.prixConseille;
  if (!s) return null;
  if (book.prix < s.min) return { tone: 'success', label: 'Sous le prix conseillé' };
  if (book.prix > s.max) return { tone: 'warning', label: 'Au-dessus du prix conseillé' };
  return { tone: 'success', label: 'Dans la fourchette conseillée' };
}
