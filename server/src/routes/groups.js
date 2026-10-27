import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { body, matchedData, param, query } from 'express-validator';
import { join } from 'node:path';
import { Group } from '../models/Group.js';
import { GroupMessage } from '../models/GroupMessage.js';
import { publicUserFields } from '../models/User.js';
import { requireAuth } from '../lib/auth.js';
import { validate } from '../lib/validate.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { searchFilter } from '../lib/text.js';
import { invalidateRecommendations } from '../lib/recommend.js';
import { pdfUpload, publicUrl, removeUpload, uploadsRoot } from '../lib/upload.js';
import { emitToUser } from '../lib/realtime.js';

export const groupsRouter = Router();

const MAX_DOCUMENTS = 30;
const idOf = (v) => String(v?._id ?? v);
const isMember = (group, userId) => group.membres.some((m) => idOf(m.utilisateur) === String(userId));
const isCreator = (group, userId) => idOf(group.createur) === String(userId);

function summarize(group, userId) {
  const now = Date.now();
  const upcoming = group.seances.filter((s) => new Date(s.date).getTime() > now).sort((a, b) => new Date(a.date) - new Date(b.date));
  return {
    _id: group._id,
    nom: group.nom,
    matiere: group.matiere,
    description: group.description,
    capaciteMax: group.capaciteMax,
    createur: group.createur,
    nbMembres: group.membres.length,
    estMembre: isMember(group, userId),
    prochaineSeance: upcoming[0] || null,
    dateCreation: group.dateCreation,
  };
}

groupsRouter.get(
  '/',
  requireAuth(),
  validate(query('q').optional().trim().isLength({ max: 100 }), query('page').optional().isInt({ min: 1 }).toInt(), query('limit').optional().isInt({ min: 1, max: 50 }).toInt()),
  async (req, res) => {
    const { q, page = 1, limit = 12 } = matchedData(req, { locations: ['query'] });
    const filter = q ? searchFilter('recherche', q) : {};
    const [groups, total] = await Promise.all([
      Group.find(filter).select('-documents').sort({ dateCreation: -1 }).skip((page - 1) * limit).limit(limit).populate('createur', publicUserFields).lean(),
      Group.countDocuments(filter),
    ]);
    res.json({ groupes: groups.map((g) => summarize(g, req.user._id)), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  },
);

groupsRouter.get('/mes-groupes', requireAuth(), async (req, res) => {
  const groups = await Group.find({ 'membres.utilisateur': req.user._id }).select('-documents').sort({ dateMaj: -1 }).populate('createur', publicUserFields).lean();
  res.json({ groupes: groups.map((g) => summarize(g, req.user._id)) });
});

groupsRouter.get('/:id', requireAuth(), validate(param('id').isMongoId()), async (req, res) => {
  const group = await Group.findById(req.params.id)
    .populate('membres.utilisateur', publicUserFields)
    .populate('documents.deposePar', 'prenom nom')
    .populate('reunion.demarrePar', 'prenom nom photoUrl')
    .lean();
  if (!group) throw notFound('Groupe introuvable.');
  const member = isMember(group, req.user._id);
  const now = Date.now();
  res.json({
    groupe: {
      ...summarize(group, req.user._id),
      estCreateur: isCreator(group, req.user._id),
      membres: group.membres,
      seances: group.seances.filter((s) => new Date(s.date).getTime() > now - 3600 * 1000).sort((a, b) => new Date(a.date) - new Date(b.date)),
      // Shared files are for members only; others just see how many there are.
      documents: member ? group.documents.sort((a, b) => new Date(b.dateDepot) - new Date(a.dateDepot)) : [],
      nbDocuments: group.documents.length,
      // The meeting link is never exposed to non-members.
      reunion: member ? (group.reunion ?? null) : null,
    },
  });
});

const groupFields = (optional) => {
  const f = (name) => (optional ? body(name).optional() : body(name));
  return [
    f('nom').trim().isLength({ min: 3, max: 80 }).withMessage('Nom de 3 à 80 caractères.'),
    f('matiere').trim().isLength({ min: 2, max: 60 }).withMessage('Indiquez la matière.'),
    body('description').optional().trim().isLength({ max: 600 }).withMessage('600 caractères maximum.'),
    body('capaciteMax').optional().isInt({ min: 2, max: 50 }).withMessage('Entre 2 et 50 membres.').toInt(),
  ];
};

groupsRouter.post('/', requireAuth(), validate(...groupFields(false)), async (req, res) => {
  const { nom, matiere, description = '', capaciteMax = 12 } = req.body;
  const group = await Group.create({ nom, matiere, description, capaciteMax, createur: req.user._id, membres: [{ utilisateur: req.user._id, role: 'CREATEUR' }] });
  res.status(201).json({ groupe: summarize(group.toObject(), req.user._id) });
});

async function loadGroup(req) {
  const group = await Group.findById(req.params.id);
  if (!group) throw notFound('Groupe introuvable.');
  return group;
}

groupsRouter.patch('/:id', requireAuth(), validate(param('id').isMongoId(), ...groupFields(true)), async (req, res) => {
  const group = await loadGroup(req);
  if (!isCreator(group, req.user._id)) throw forbidden('PAS_CREATEUR', 'Seul le créateur peut modifier le groupe.');
  if (req.body.capaciteMax !== undefined && req.body.capaciteMax < group.membres.length) {
    throw badRequest('VALIDATION', 'Certains champs sont invalides.', { capaciteMax: `Le groupe compte déjà ${group.membres.length} membres.` });
  }
  for (const k of ['nom', 'matiere', 'description', 'capaciteMax']) if (req.body[k] !== undefined) group[k] = req.body[k];
  await group.save();
  res.json({ groupe: summarize(group.toObject(), req.user._id) });
});

groupsRouter.delete('/:id', requireAuth(), validate(param('id').isMongoId()), async (req, res) => {
  const group = await loadGroup(req);
  if (!isCreator(group, req.user._id) && req.user.role !== 'ADMIN') throw forbidden('PAS_CREATEUR', 'Seul le créateur peut supprimer le groupe.');
  const groupId = group._id;
  await group.deleteOne();
  await Promise.all([...group.documents.map((d) => removeUpload(d.url)), GroupMessage.deleteMany({ groupe: groupId })]);
  res.status(204).end();
});

groupsRouter.post('/:id/membres', requireAuth(), validate(param('id').isMongoId()), async (req, res) => {
  // Membership and capacity are checked in the same atomic update, so a full group can't be overfilled.
  const updated = await Group.findOneAndUpdate(
    { _id: req.params.id, 'membres.utilisateur': { $ne: req.user._id }, $expr: { $lt: [{ $size: '$membres' }, '$capaciteMax'] } },
    { $push: { membres: { utilisateur: req.user._id, role: 'MEMBRE' } } },
    { returnDocument: 'after' },
  ).lean();
  if (!updated) {
    const group = await Group.findById(req.params.id).lean();
    if (!group) throw notFound('Groupe introuvable.');
    if (isMember(group, req.user._id)) throw conflict('DEJA_MEMBRE', 'Vous êtes déjà membre de ce groupe.');
    throw conflict('GROUPE_COMPLET', 'Ce groupe est complet.');
  }
  invalidateRecommendations(req.user._id);
  res.status(201).json({ groupe: summarize(updated, req.user._id) });
});

groupsRouter.delete('/:id/membres/:uid', requireAuth(), validate(param('id').isMongoId(), param('uid').isMongoId()), async (req, res) => {
  const group = await loadGroup(req);
  const self = req.params.uid === String(req.user._id);
  if (!self && !isCreator(group, req.user._id)) throw forbidden('PAS_CREATEUR', 'Seul le créateur peut retirer un membre.');
  if (req.params.uid === idOf(group.createur)) throw badRequest('CREATEUR_NE_PART_PAS', 'Le créateur ne peut pas quitter son groupe ; supprimez-le si vous ne l’animez plus.');
  const { modifiedCount } = await Group.updateOne({ _id: group._id }, { $pull: { membres: { utilisateur: req.params.uid } } });
  if (!modifiedCount) throw notFound("Ce membre ne fait pas partie du groupe.");
  res.status(204).end();
});

async function loadForMember(req) {
  const group = await loadGroup(req);
  if (!isMember(group, req.user._id)) throw forbidden('PAS_MEMBRE', 'Rejoignez le groupe pour participer.');
  return group;
}

const emitToMembers = (group, event, payload) => {
  for (const member of group.membres) emitToUser(member.utilisateur, event, payload);
};

const liveAuthor = (user) => ({ _id: user._id, prenom: user.prenom, nom: user.nom, photoUrl: user.photoUrl });

groupsRouter.get(
  '/:id/messages',
  requireAuth(),
  validate(param('id').isMongoId(), query('avant').optional().isISO8601().toDate(), query('limit').optional().isInt({ min: 1, max: 50 }).toInt()),
  async (req, res) => {
    const group = await loadForMember(req);
    const { avant, limit = 30 } = matchedData(req, { locations: ['query'] });
    const filter = { groupe: group._id };
    if (avant) filter.dateEnvoi = { $lt: avant };
    const page = await GroupMessage.find(filter).sort({ dateEnvoi: -1 }).limit(limit + 1).populate('auteur', publicUserFields).lean();
    res.json({ messages: page.slice(0, limit).reverse(), plusAnciens: page.length > limit });
  },
);

groupsRouter.post(
  '/:id/messages',
  requireAuth(),
  validate(
    param('id').isMongoId(),
    body('contenu').isString().withMessage('Message invalide.').bail().trim().isLength({ min: 1, max: 2000 }).withMessage('Le message doit contenir entre 1 et 2000 caractères.'),
    body('clientId').isString().withMessage('Identifiant de message manquant.').bail().trim().isLength({ min: 1, max: 64 }).withMessage('Identifiant de message invalide.'),
  ),
  async (req, res) => {
    const group = await loadForMember(req);
    const { contenu, clientId } = req.body;
    const existing = await GroupMessage.findOne({ groupe: group._id, auteur: req.user._id, clientId }).populate('auteur', publicUserFields).lean();
    if (existing) return res.status(200).json({ message: existing, duplicate: true });

    let message;
    try {
      message = (await GroupMessage.create({ groupe: group._id, auteur: req.user._id, contenu, clientId })).toObject();
    } catch (err) {
      // A concurrent resend with the same clientId won the race; return the stored message.
      if (err.code === 11000) {
        const duplicate = await GroupMessage.findOne({ groupe: group._id, auteur: req.user._id, clientId }).populate('auteur', publicUserFields).lean();
        return res.status(200).json({ message: duplicate, duplicate: true });
      }
      throw err;
    }
    // The live payload carries the author so other members can render it without another request.
    const live = { ...message, auteur: liveAuthor(req.user) };
    emitToMembers(group, 'groupe:message', live);
    res.status(201).json({ message: live });
  },
);

groupsRouter.post(
  '/:id/reunion',
  requireAuth(),
  validate(param('id').isMongoId(), body('sujet').optional({ values: 'falsy' }).isString().trim().isLength({ max: 120 }).withMessage('120 caractères maximum.')),
  async (req, res) => {
    const group = await loadForMember(req);
    if (group.reunion) {
      // Another member opened the room first: everyone joins the same meeting.
      await group.populate('reunion.demarrePar', 'prenom nom photoUrl');
      return res.status(200).json({ reunion: group.reunion });
    }

    const sujet = String(req.body?.sujet || '').trim() || 'Réunion du groupe';
    const salon = `CampusHub-${group._id.toString().slice(-6)}-${randomBytes(12).toString('hex')}`;
    group.reunion = { sujet, salon, url: `https://meet.jit.si/${salon}`, demarrePar: req.user._id, demarreeLe: new Date() };
    await group.save();

    const live = { ...group.reunion.toObject(), demarrePar: liveAuthor(req.user) };
    emitToMembers(group, 'groupe:reunion', { groupeId: String(group._id), nom: group.nom, reunion: live });
    res.status(201).json({ reunion: live });
  },
);

groupsRouter.delete('/:id/reunion', requireAuth(), validate(param('id').isMongoId()), async (req, res) => {
  const group = await loadForMember(req);
  if (!group.reunion) throw notFound('Aucune réunion en cours.');
  if (String(group.reunion.demarrePar) !== String(req.user._id) && !isCreator(group, req.user._id)) {
    throw forbidden('PAS_AUTEUR', 'Seul l’organisateur de la réunion ou le créateur du groupe peut la terminer.');
  }
  group.reunion = null;
  await group.save();
  emitToMembers(group, 'groupe:reunion', { groupeId: String(group._id), nom: group.nom, reunion: null });
  res.status(204).end();
});

groupsRouter.post(
  '/:id/seances',
  requireAuth(),
  validate(
    param('id').isMongoId(),
    body('date')
      .isISO8601()
      .withMessage('Date invalide.')
      .bail()
      .toDate()
      .custom((d) => d.getTime() > Date.now())
      .withMessage('La séance doit être dans le futur.'),
    body('duree').optional().isInt({ min: 15, max: 480 }).withMessage('Durée entre 15 et 480 minutes.').toInt(),
    body('lieu').trim().isLength({ min: 2, max: 80 }).withMessage('Indiquez le lieu (ou « En ligne »).'),
    body('sujet').trim().isLength({ min: 3, max: 120 }).withMessage('Indiquez le sujet de la séance.'),
  ),
  async (req, res) => {
    const group = await loadForMember(req);
    const { date, duree = 90, lieu, sujet } = req.body;
    group.seances.push({ date, duree, lieu, sujet, creePar: req.user._id });
    await group.save();
    res.status(201).json({ seance: group.seances.at(-1) });
  },
);

groupsRouter.delete('/:id/seances/:sid', requireAuth(), validate(param('id').isMongoId(), param('sid').isMongoId()), async (req, res) => {
  const group = await loadForMember(req);
  const session = group.seances.id(req.params.sid);
  if (!session) throw notFound('Séance introuvable.');
  if (String(session.creePar) !== String(req.user._id) && !isCreator(group, req.user._id)) throw forbidden('PAS_AUTEUR', 'Seul l’organisateur de la séance ou le créateur du groupe peut la supprimer.');
  session.deleteOne();
  await group.save();
  res.status(204).end();
});

groupsRouter.post('/:id/documents', requireAuth(), validate(param('id').isMongoId()), pdfUpload.single('fichier'), async (req, res) => {
  if (!req.file) throw badRequest('FICHIER_MANQUANT', 'Ajoutez un fichier PDF.');
  const group = await loadForMember(req);
  if (group.documents.length >= MAX_DOCUMENTS) throw conflict('TROP_DE_DOCUMENTS', `${MAX_DOCUMENTS} documents maximum par groupe.`);
  const nomFichier = req.file.originalname.slice(0, 160);
  group.documents.push({ nomFichier, url: publicUrl(req.file), taille: req.file.size, deposePar: req.user._id });
  await group.save();
  res.status(201).json({ document: group.documents.at(-1) });
});

groupsRouter.get('/:id/documents/:did', requireAuth(), validate(param('id').isMongoId(), param('did').isMongoId()), async (req, res) => {
  const group = await loadForMember(req);
  const doc = group.documents.id(req.params.did);
  if (!doc) throw notFound('Document introuvable.');
  const file = join(uploadsRoot, doc.url.slice('/uploads/'.length));
  res.download(file, doc.nomFichier, { headers: { 'Content-Type': 'application/pdf' } });
});

groupsRouter.delete('/:id/documents/:did', requireAuth(), validate(param('id').isMongoId(), param('did').isMongoId()), async (req, res) => {
  const group = await loadForMember(req);
  const doc = group.documents.id(req.params.did);
  if (!doc) throw notFound('Document introuvable.');
  if (String(doc.deposePar) !== String(req.user._id) && !isCreator(group, req.user._id)) throw forbidden('PAS_AUTEUR', 'Seul l’auteur du dépôt ou le créateur du groupe peut le supprimer.');
  const url = doc.url;
  doc.deleteOne();
  await group.save();
  await removeUpload(url);
  res.status(204).end();
});

groupsRouter.use(async (err, req, res, next) => {
  if (req.file) await removeUpload(publicUrl(req.file));
  next(err);
});
