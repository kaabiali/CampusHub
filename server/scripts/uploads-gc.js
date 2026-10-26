// Lists (and with --delete removes) uploaded files that no document references any more.
import mongoose from 'mongoose';
import { readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from '../src/config.js';
import { connectDb } from '../src/db.js';
import { uploadsRoot } from '../src/lib/upload.js';
import { Book } from '../src/models/Book.js';
import { Group } from '../src/models/Group.js';
import { User } from '../src/models/User.js';

const remove = process.argv.includes('--delete');

async function referenced() {
  const urls = new Set();
  for (const b of await Book.find().select('photos').lean()) b.photos.forEach((p) => urls.add(p.url));
  for (const g of await Group.find().select('documents').lean()) g.documents.forEach((d) => urls.add(d.url));
  for (const u of await User.find({ photoUrl: { $ne: null } }).select('photoUrl').lean()) urls.add(u.photoUrl);
  return urls;
}

async function main() {
  await connectDb(config.mongoUrl);
  const keep = await referenced();
  let orphans = 0;
  for (const dir of ['annonces', 'avatars', 'documents']) {
    const files = await readdir(join(uploadsRoot, dir)).catch(() => []);
    for (const f of files) {
      if (keep.has(`/uploads/${dir}/${f}`)) continue;
      orphans += 1;
      console.log(`${remove ? 'supprimé' : 'orphelin'}  ${dir}/${f}`);
      if (remove) await unlink(join(uploadsRoot, dir, f));
    }
  }
  console.log(orphans ? `${orphans} fichier(s) ${remove ? 'supprimé(s)' : 'non référencé(s) ; relancez avec --delete pour les supprimer'}.` : 'Aucun fichier orphelin.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
