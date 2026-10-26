const TZ = 'Africa/Tunis';

const make = (opts) => new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, ...opts });
const fmtDayLong = make({ weekday: 'long', day: 'numeric', month: 'long' });
const fmtDayShort = make({ weekday: 'short', day: 'numeric', month: 'short' });
const fmtTime = make({ hour: '2-digit', minute: '2-digit' });
const fmtMonth = make({ month: 'short' });
const fmtDayNum = make({ day: '2-digit' });
const fmtDateInput = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

export const dayLong = (d) => capitalize(fmtDayLong.format(new Date(d)));
export const dayShort = (d) => fmtDayShort.format(new Date(d));
export const time = (d) => fmtTime.format(new Date(d));
export const monthShort = (d) => fmtMonth.format(new Date(d)).replace('.', '');
export const dayNum = (d) => fmtDayNum.format(new Date(d));
export const isoDay = (d = new Date()) => fmtDateInput.format(new Date(d));

export const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// <input type="datetime-local"> has no time zone; values are read and written as Tunis time (UTC+1, no DST).
export const toTunisInput = (d) => `${isoDay(d)}T${time(d)}`;
export const fromTunisInput = (value) => new Date(`${value}:00+01:00`).toISOString();
export const addMinutes = (d, m) => new Date(new Date(d).getTime() + m * 60_000);

export function relative(d) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 172800) return 'Hier';
  return dayShort(d);
}

const fmtPrice = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });
export const price = (n) => `${fmtPrice.format(n)} DT`;

export const initials = (u) => `${u?.prenom?.[0] || ''}${u?.nom?.[0] || ''}`.toUpperCase();
export const shortName = (u) => (u ? `${u.prenom} ${u.nom?.[0] || ''}.` : '');
export const fullName = (u) => (u ? `${u.prenom} ${u.nom}` : '');

export const plural = (n, one, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
