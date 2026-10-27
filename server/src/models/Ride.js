import mongoose from 'mongoose';
import { foldText } from '../lib/text.js';

export const STATUTS_TRAJET = ['OUVERT', 'COMPLET', 'ANNULE', 'TERMINE'];

// Optional map position; labels stay in lieuDepart/lieuArrivee so old rides and text search keep working.
const pointSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false },
);

const rideSchema = new mongoose.Schema(
  {
    conducteur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true, index: true },
    lieuDepart: { type: String, required: true, trim: true, maxlength: 80 },
    lieuArrivee: { type: String, required: true, trim: true, maxlength: 80 },
    coordDepart: { type: pointSchema, default: null },
    coordArrivee: { type: pointSchema, default: null },
    dateDepart: { type: Date, required: true },
    dureeMinutes: { type: Number, min: 5, max: 240, default: null },
    placesTotales: { type: Number, required: true, min: 1, max: 6 },
    // Kept in sync with confirmed reservations inside the same transaction; min 0 makes overbooking a hard error.
    placesDisponibles: { type: Number, required: true, min: 0 },
    prix: { type: Number, required: true, min: 0, max: 50 },
    vehicule: { type: String, trim: true, maxlength: 60, default: '' },
    details: { type: String, trim: true, maxlength: 300, default: '' },
    statut: { type: String, enum: STATUTS_TRAJET, default: 'OUVERT' },
    recherche: { type: String, select: false },
  },
  { timestamps: true },
);

rideSchema.index({ statut: 1, dateDepart: 1 });
rideSchema.pre('validate', function () {
  this.recherche = foldText(`${this.lieuDepart} ${this.lieuArrivee}`);
});

export const Ride = mongoose.model('Trajet', rideSchema, 'trajets');
