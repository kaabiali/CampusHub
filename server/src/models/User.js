import mongoose from 'mongoose';

const jetonSchema = new mongoose.Schema({ hash: String, expire: Date }, { _id: false });

const userSchema = new mongoose.Schema(
  {
    prenom: { type: String, required: true, trim: true, maxlength: 50 },
    nom: { type: String, required: true, trim: true, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    motDePasseHache: { type: String, required: true },
    // Google account subject ("sub"), set when the account is created or linked through Google.
    googleId: { type: String, default: null, index: true },
    role: { type: String, enum: ['ETUDIANT', 'ADMIN'], default: 'ETUDIANT' },
    filiere: { type: String, trim: true, maxlength: 80, default: '' },
    niveau: { type: String, trim: true, maxlength: 40, default: '' },
    matieres: { type: [String], default: [] },
    centresInteret: { type: [String], default: [] },
    photoUrl: { type: String, default: null },
    emailVerifie: { type: Boolean, default: false },
    estBloque: { type: Boolean, default: false },
    estSupprime: { type: Boolean, default: false },
    noteMoyenne: { type: Number, default: null },
    nbAvis: { type: Number, default: 0 },
    // Bumped on password change, block or reset; JWTs carrying an older value are rejected.
    jetonVersion: { type: Number, default: 0 },
    jetonVerification: { type: jetonSchema, default: null },
    jetonReset: { type: jetonSchema, default: null },
  },
  {
    timestamps: { createdAt: 'dateInscription', updatedAt: 'dateMaj' },
    toJSON: {
      transform(doc, ret) {
        delete ret.motDePasseHache;
        delete ret.googleId;
        delete ret.jetonVersion;
        delete ret.jetonVerification;
        delete ret.jetonReset;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const User = mongoose.model('Utilisateur', userSchema, 'utilisateurs');

export const publicUserFields = 'prenom nom filiere niveau photoUrl noteMoyenne nbAvis role';
