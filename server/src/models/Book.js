import mongoose from 'mongoose';
import { foldText } from '../lib/text.js';

export const ETATS = ['NEUF', 'TRES_BON', 'BON', 'ACCEPTABLE'];
export const STATUTS_ANNONCE = ['DISPONIBLE', 'VENDUE', 'MASQUEE'];

const bookSchema = new mongoose.Schema(
  {
    vendeur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true, index: true },
    categorie: { type: mongoose.Schema.Types.ObjectId, ref: 'Categorie', required: true },
    titre: { type: String, required: true, trim: true, maxlength: 120 },
    auteur: { type: String, trim: true, maxlength: 80, default: '' },
    matiere: { type: String, required: true, trim: true, maxlength: 60 },
    etat: { type: String, enum: ETATS, required: true },
    anneeEdition: { type: Number, min: 1950, max: 2100 },
    prixNeuf: { type: Number, min: 0, max: 2000 },
    prix: { type: Number, required: true, min: 0, max: 2000 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    prixConseille: {
      type: new mongoose.Schema({ min: Number, max: Number, source: { type: String, enum: ['ml', 'fallback'] } }, { _id: false }),
      default: null,
    },
    photos: {
      type: [new mongoose.Schema({ url: { type: String, required: true }, ordre: { type: Number, default: 0 } }, { _id: false })],
      validate: [(arr) => arr.length <= 5, '5 photos maximum.'],
      default: [],
    },
    statut: { type: String, enum: STATUTS_ANNONCE, default: 'DISPONIBLE' },
    vues: { type: Number, default: 0 },
    recherche: { type: String, select: false },
  },
  { timestamps: { createdAt: 'datePublication', updatedAt: 'dateMaj' } },
);

bookSchema.index({ statut: 1, categorie: 1, prix: 1 });
bookSchema.index({ statut: 1, datePublication: -1 });
bookSchema.pre('validate', function () {
  this.recherche = foldText(`${this.titre} ${this.auteur} ${this.matiere}`);
});

export const Book = mongoose.model('Annonce', bookSchema, 'annonces');
