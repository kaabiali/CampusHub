import mongoose from 'mongoose';

export const TYPES_NOTIFICATION = ['RESERVATION', 'MESSAGE', 'RAPPEL_EVENEMENT'];

const notificationSchema = new mongoose.Schema(
  {
    utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
    type: { type: String, enum: TYPES_NOTIFICATION, required: true },
    contenu: { type: String, required: true, maxlength: 300 },
    lien: { type: String, default: null },
    // Set when a notification must exist at most once (e.g. one reminder per registration).
    cleDedup: { type: String, default: undefined },
    lue: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'dateCreation', updatedAt: false } },
);

notificationSchema.index({ utilisateur: 1, lue: 1, dateCreation: -1 });
notificationSchema.index({ cleDedup: 1 }, { unique: true, sparse: true });

export const Notification = mongoose.model('Notification', notificationSchema, 'notifications');
