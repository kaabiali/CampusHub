import mongoose from 'mongoose';
import { foldText } from '../lib/text.js';
// Registers the model behind `ref: 'Club'` so populate works wherever Event is used (e.g. the reminder job).
import './Club.js';

const { ObjectId } = mongoose.Schema.Types;

const eventSchema = new mongoose.Schema(
  {
    organisateur: { type: ObjectId, ref: 'Utilisateur', required: true },
    club: { type: ObjectId, ref: 'Club', required: true, index: true },
    titre: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    lieu: { type: String, required: true, trim: true, maxlength: 80 },
    dateDebut: { type: Date, required: true },
    dateFin: { type: Date, default: null },
    // null means unlimited (e.g. a blood drive with open entry).
    capacite: { type: Number, min: 1, max: 5000, default: null },
    nbInscrits: { type: Number, default: 0, min: 0 },
    estPublic: { type: Boolean, default: true },
    statut: { type: String, enum: ['PUBLIE', 'ANNULE'], default: 'PUBLIE' },
    recherche: { type: String, select: false },
  },
  { timestamps: true },
);

eventSchema.index({ statut: 1, dateDebut: 1 });
eventSchema.pre('validate', function () {
  this.recherche = foldText(`${this.titre} ${this.description} ${this.lieu}`);
});

export const Event = mongoose.model('Evenement', eventSchema, 'evenements');

const registrationSchema = new mongoose.Schema(
  {
    evenement: { type: ObjectId, ref: 'Evenement', required: true },
    utilisateur: { type: ObjectId, ref: 'Utilisateur', required: true, index: true },
    rappelEnvoye: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'dateInscription', updatedAt: false } },
);

registrationSchema.index({ evenement: 1, utilisateur: 1 }, { unique: true });
registrationSchema.index({ rappelEnvoye: 1, evenement: 1 });

export const Registration = mongoose.model('Inscription', registrationSchema, 'inscriptions');
