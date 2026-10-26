import mongoose from 'mongoose';

export const TYPES_CONTENU = ['ANNONCE', 'TRAJET', 'EVENEMENT', 'MESSAGE'];

const reportSchema = new mongoose.Schema(
  {
    typeContenu: { type: String, enum: TYPES_CONTENU, required: true },
    contenuId: { type: mongoose.Schema.Types.ObjectId, required: true },
    motif: { type: String, required: true, trim: true, maxlength: 300 },
    signalePar: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
    statut: { type: String, enum: ['EN_ATTENTE', 'TRAITE', 'REJETE'], default: 'EN_ATTENTE' },
    traitePar: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', default: null },
    dateTraitement: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'dateSignalement', updatedAt: false } },
);

reportSchema.index({ statut: 1, dateSignalement: -1 });
// A student can have one open report per piece of content; resubmitting is a no-op.
reportSchema.index({ typeContenu: 1, contenuId: 1, signalePar: 1 }, { unique: true, partialFilterExpression: { statut: 'EN_ATTENTE' } });

export const Report = mongoose.model('Signalement', reportSchema, 'signalements');
