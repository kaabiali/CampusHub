export const TIME_ZONE = 'Africa/Tunis';

const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

export const tunisDay = (date = new Date()) => dayFormatter.format(date);

// Africa/Tunis is UTC+1 all year (no DST), so a calendar day is a fixed UTC window.
export function tunisDayRange(isoDay) {
  const start = new Date(`${isoDay}T00:00:00+01:00`);
  return { start, end: new Date(start.getTime() + 24 * 3600 * 1000) };
}

export const formatDateFr = (date) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(date);
