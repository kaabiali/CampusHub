import mongoose from 'mongoose';
import { foldText } from '../lib/text.js';

const { ObjectId } = mongoose.Schema.Types;

const memberSchema = new mongoose.Schema(
  {
    utilisateur: { type: ObjectId, ref: 'Utilisateur', required: true },
    role: { type: String, enum: ['CREATEUR', 'MEMBRE'], default: 'MEMBRE' },
    dateAdhesion: { type: Date, default: Date.now },
  },
  { _id: false },
);

const sessionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  duree: { type: Number, min: 15, max: 480, default: 90 },
  lieu: { type: String, required: true, trim: true, maxlength: 80 },
  sujet: { type: String, required: true, trim: true, maxlength: 120 },
  creePar: { type: ObjectId, ref: 'Utilisateur', required: true },
});

const documentSchema = new mongoose.Schema({
  nomFichier: { type: String, required: true, maxlength: 160 },
  url: { type: String, required: true },
  taille: { type: Number, required: true },
  deposePar: { type: ObjectId, ref: 'Utilisateur', required: true },
  dateDepot: { type: Date, default: Date.now },
});

const groupSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true, maxlength: 80 },
    matiere: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 600, default: '' },
    createur: { type: ObjectId, ref: 'Utilisateur', required: true },
    capaciteMax: { type: Number, min: 2, max: 50, default: 12 },
    membres: { type: [memberSchema], default: [] },
    seances: { type: [sessionSchema], default: [] },
    documents: { type: [documentSchema], default: [] },
    recherche: { type: String, select: false },
  },
  { timestamps: { createdAt: 'dateCreation', updatedAt: 'dateMaj' } },
);

groupSchema.index({ 'membres.utilisateur': 1 });
groupSchema.index({ dateCreation: -1 });
groupSchema.pre('validate', function () {
  this.recherche = foldText(`${this.nom} ${this.matiere} ${this.description}`);
});

export const Group = mongoose.model('Groupe', groupSchema, 'groupes');
