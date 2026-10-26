import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
  jour: { type: String, required: true },
});
activitySchema.index({ utilisateur: 1, jour: 1 }, { unique: true });
activitySchema.index({ jour: 1 });

export const Activity = mongoose.model('Activite', activitySchema, 'activites');
