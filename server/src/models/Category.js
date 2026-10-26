import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { timestamps: true },
);

export const Category = mongoose.model('Categorie', categorySchema, 'categories');

export const DEFAULT_CATEGORIES = [
  { nom: 'Mathématiques', description: 'Analyse, algèbre, probabilités, statistique' },
  { nom: 'Informatique', description: 'Programmation, bases de données, réseaux, IA' },
  { nom: 'Physique', description: 'Mécanique, électricité, thermodynamique' },
  { nom: 'Langues', description: 'Anglais, français, allemand' },
  { nom: 'Économie et gestion', description: 'Économie, comptabilité, management' },
];

export async function ensureDefaultCategories() {
  if (await Category.estimatedDocumentCount()) return;
  await Category.insertMany(DEFAULT_CATEGORIES, { ordered: false }).catch((err) => {
    if (err.code !== 11000) throw err;
  });
}
