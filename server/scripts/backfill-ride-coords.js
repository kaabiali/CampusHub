// One-off maintenance: add map coordinates to demo rides created before the map existed.
// Labels are matched against the same landmarks the seed uses; anything else is left untouched.
import mongoose from 'mongoose';
import { config } from '../src/config.js';
import { connectDb } from '../src/db.js';
import { Ride } from '../src/models/Ride.js';
import { coordsOf } from '../src/lib/places.js';

await connectDb(config.mongoUrl);

const rides = await Ride.find({ $or: [{ coordDepart: null }, { coordArrivee: null }] });
let updated = 0;
for (const ride of rides) {
  const coordDepart = ride.coordDepart || coordsOf(ride.lieuDepart);
  const coordArrivee = ride.coordArrivee || coordsOf(ride.lieuArrivee);
  if (!coordDepart && !coordArrivee) continue;
  ride.coordDepart = coordDepart;
  ride.coordArrivee = coordArrivee;
  await ride.save();
  updated += 1;
}

console.log(`Ride coordinates backfilled: ${updated}/${rides.length} incomplete ride(s).`);
await mongoose.disconnect();
