import mongoose from 'mongoose';

const clubSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    responsables: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' }],
  },
  { timestamps: true },
);

clubSchema.index({ responsables: 1 });

export const Club = mongoose.model('Club', clubSchema, 'clubs');
