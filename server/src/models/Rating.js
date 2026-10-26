import mongoose from 'mongoose';
import { User } from './User.js';

const ratingSchema = new mongoose.Schema(
  {
    reservation: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', required: true, unique: true },
    trajet: { type: mongoose.Schema.Types.ObjectId, ref: 'Trajet', required: true },
    auteur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
    conducteur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true, index: true },
    note: { type: Number, required: true, min: 1, max: 5 },
    commentaire: { type: String, trim: true, maxlength: 300, default: '' },
  },
  { timestamps: { createdAt: 'date', updatedAt: false } },
);

export const Rating = mongoose.model('Avis', ratingSchema, 'avis');

export async function refreshDriverRating(conducteurId) {
  const [agg] = await Rating.aggregate([{ $match: { conducteur: conducteurId } }, { $group: { _id: null, moyenne: { $avg: '$note' }, n: { $sum: 1 } } }]);
  await User.updateOne({ _id: conducteurId }, { noteMoyenne: agg ? Math.round(agg.moyenne * 10) / 10 : null, nbAvis: agg?.n ?? 0 });
}
