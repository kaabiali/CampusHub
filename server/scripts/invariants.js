// Recomputes every derived counter from its source records. Exit code 1 on drift; --fix repairs it.
import mongoose from 'mongoose';
import { config } from '../src/config.js';
import { connectDb } from '../src/db.js';
import { Ride } from '../src/models/Ride.js';
import { Reservation } from '../src/models/Reservation.js';
import { Event, Registration } from '../src/models/Event.js';
import { Rating } from '../src/models/Rating.js';
import { User } from '../src/models/User.js';

const fix = process.argv.includes('--fix');

async function checkRides() {
  const booked = new Map(
    (await Reservation.aggregate([{ $match: { statut: 'CONFIRMEE' } }, { $group: { _id: '$trajet', n: { $sum: '$nbPlaces' } } }])).map((r) => [String(r._id), r.n]),
  );
  const drift = [];
  for await (const ride of Ride.find().select('placesTotales placesDisponibles statut dateDepart').cursor()) {
    const expected = ride.placesTotales - (booked.get(String(ride._id)) ?? 0);
    const expectedStatut = ['OUVERT', 'COMPLET'].includes(ride.statut) ? (expected <= 0 ? 'COMPLET' : 'OUVERT') : ride.statut;
    if (ride.placesDisponibles !== expected || ride.statut !== expectedStatut) {
      drift.push({ trajet: String(ride._id), placesDisponibles: [ride.placesDisponibles, expected], statut: [ride.statut, expectedStatut] });
      if (fix) await Ride.updateOne({ _id: ride._id }, { placesDisponibles: Math.max(0, expected), statut: expectedStatut });
    }
  }
  return drift;
}

async function checkEvents() {
  const counts = new Map((await Registration.aggregate([{ $group: { _id: '$evenement', n: { $sum: 1 } } }])).map((r) => [String(r._id), r.n]));
  const drift = [];
  for await (const event of Event.find().select('nbInscrits capacite').cursor()) {
    const expected = counts.get(String(event._id)) ?? 0;
    if (event.nbInscrits !== expected) {
      drift.push({ evenement: String(event._id), nbInscrits: [event.nbInscrits, expected], overCapacity: event.capacite !== null && expected > event.capacite });
      if (fix) await Event.updateOne({ _id: event._id }, { nbInscrits: expected });
    }
  }
  return drift;
}

async function checkRatings() {
  const stats = new Map(
    (await Rating.aggregate([{ $group: { _id: '$conducteur', moyenne: { $avg: '$note' }, n: { $sum: 1 } } }])).map((r) => [String(r._id), { moyenne: Math.round(r.moyenne * 10) / 10, n: r.n }]),
  );
  const drift = [];
  for await (const user of User.find({ $or: [{ nbAvis: { $gt: 0 } }, { _id: { $in: [...stats.keys()] } }] }).select('noteMoyenne nbAvis').cursor()) {
    const s = stats.get(String(user._id)) ?? { moyenne: null, n: 0 };
    if (user.noteMoyenne !== s.moyenne || user.nbAvis !== s.n) {
      drift.push({ conducteur: String(user._id), noteMoyenne: [user.noteMoyenne, s.moyenne], nbAvis: [user.nbAvis, s.n] });
      if (fix) await User.updateOne({ _id: user._id }, { noteMoyenne: s.moyenne, nbAvis: s.n });
    }
  }
  return drift;
}

async function main() {
  await connectDb(config.mongoUrl);
  const report = { trajets: await checkRides(), evenements: await checkEvents(), notes: await checkRatings() };
  const total = Object.values(report).reduce((n, list) => n + list.length, 0);
  for (const [name, list] of Object.entries(report)) {
    console.log(`${name.padEnd(11)} ${list.length ? `${list.length} écart(s)${fix ? ' corrigé(s)' : ''}` : 'OK'}`);
    for (const d of list.slice(0, 20)) console.log('  ', JSON.stringify(d));
  }
  if (total && !fix) {
    console.log('\nRelancez avec --fix pour corriger les compteurs.');
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
