import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema(
  {
    trajet: { type: mongoose.Schema.Types.ObjectId, ref: 'Trajet', required: true },
    passager: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true, index: true },
    nbPlaces: { type: Number, required: true, min: 1, max: 6 },
    statut: { type: String, enum: ['CONFIRMEE', 'ANNULEE'], default: 'CONFIRMEE' },
    dateAnnulation: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'dateReservation', updatedAt: false } },
);

reservationSchema.index({ trajet: 1, statut: 1 });
// One live reservation per passenger and ride; a cancelled one doesn't block re-booking.
reservationSchema.index({ trajet: 1, passager: 1 }, { unique: true, partialFilterExpression: { statut: 'CONFIRMEE' } });

export const Reservation = mongoose.model('Reservation', reservationSchema, 'reservations');
