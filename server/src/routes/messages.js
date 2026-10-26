import { Router } from 'express';
import mongoose from 'mongoose';
import { body, matchedData, param, query } from 'express-validator';
import { Message, conversationKey } from '../models/Message.js';
import { Notification } from '../models/Notification.js';
import { User, publicUserFields } from '../models/User.js';
import { requireAuth } from '../lib/auth.js';
import { validate } from '../lib/validate.js';
import { notFound } from '../lib/errors.js';
import { markRead, sendMessage } from '../lib/messaging.js';
import { emitToUser } from '../lib/realtime.js';

export const conversationsRouter = Router();

conversationsRouter.get('/', requireAuth(), async (req, res) => {
  const me = req.user._id;
  const rows = await Message.aggregate([
    { $match: { $or: [{ expediteur: me }, { destinataire: me }] } },
    { $sort: { dateEnvoi: -1 } },
    {
      $group: {
        _id: '$cleConversation',
        dernier: { $first: '$$ROOT' },
        nonLus: { $sum: { $cond: [{ $and: [{ $eq: ['$destinataire', me] }, { $eq: ['$lu', false] }] }, 1, 0] } },
        contexte: { $first: '$contexte' },
      },
    },
    { $sort: { 'dernier.dateEnvoi': -1 } },
    { $limit: 100 },
  ]);
  const otherIds = rows.map((r) => (String(r.dernier.expediteur) === String(me) ? r.dernier.destinataire : r.dernier.expediteur));
  const users = new Map((await User.find({ _id: { $in: otherIds } }).select(publicUserFields).lean()).map((u) => [String(u._id), u]));
  res.json({
    conversations: rows
      .map((r, i) => ({ avec: users.get(String(otherIds[i])), dernier: r.dernier, nonLus: r.nonLus, contexte: r.contexte }))
      .filter((c) => c.avec),
  });
});

conversationsRouter.get(
  '/:uid/messages',
  requireAuth(),
  validate(param('uid').isMongoId(), query('avant').optional().isISO8601().toDate(), query('limit').optional().isInt({ min: 1, max: 100 }).toInt()),
  async (req, res) => {
    const { avant, limit = 40 } = matchedData(req, { locations: ['query'] });
    const other = await User.findById(req.params.uid).select(publicUserFields).lean();
    if (!other) throw notFound('Utilisateur introuvable.');
    const filter = { cleConversation: conversationKey(req.user._id, other._id) };
    if (avant) filter.dateEnvoi = { $lt: avant };
    const page = await Message.find(filter).sort({ dateEnvoi: -1 }).limit(limit + 1).lean();
    res.json({ avec: other, messages: page.slice(0, limit).reverse(), plusAnciens: page.length > limit });
  },
);

conversationsRouter.post(
  '/:uid/messages',
  requireAuth(),
  validate(param('uid').isMongoId(), body('contenu').isString(), body('clientId').isString(), body('contexte').optional({ values: 'null' }).isObject()),
  async (req, res) => {
    const { message, duplicate } = await sendMessage(req.user, { destinataire: req.params.uid, ...req.body });
    res.status(duplicate ? 200 : 201).json({ message });
  },
);

conversationsRouter.post('/:uid/lu', requireAuth(), validate(param('uid').isMongoId()), async (req, res) => {
  const marked = await markRead(req.user, new mongoose.Types.ObjectId(req.params.uid));
  // Reading the thread also clears its bell notification.
  await Notification.updateMany({ utilisateur: req.user._id, type: 'MESSAGE', lien: `/messages/${req.params.uid}`, lue: false }, { lue: true });
  res.json({ marques: marked });
});

export const notificationsRouter = Router();

notificationsRouter.get('/', requireAuth(), validate(query('limit').optional().isInt({ min: 1, max: 50 }).toInt()), async (req, res) => {
  const { limit = 20 } = matchedData(req, { locations: ['query'] });
  const [notifications, nonLues] = await Promise.all([
    Notification.find({ utilisateur: req.user._id }).sort({ dateCreation: -1 }).limit(limit).lean(),
    Notification.countDocuments({ utilisateur: req.user._id, lue: false }),
  ]);
  res.json({ notifications, nonLues });
});

notificationsRouter.post('/lues', requireAuth(), validate(body('ids').optional().isArray({ max: 100 }), body('ids.*').isMongoId()), async (req, res) => {
  const filter = { utilisateur: req.user._id, lue: false };
  if (req.body.ids) filter._id = { $in: req.body.ids };
  const { modifiedCount } = await Notification.updateMany(filter, { lue: true });
  emitToUser(req.user._id, 'notifications:lues', { ids: req.body.ids || null });
  res.json({ marquees: modifiedCount });
});

export function handleSocket(socket) {
  const user = socket.data.user;
  socket.on('message:send', async (payload, ack) => {
    if (typeof ack !== 'function') return;
    try {
      const { message } = await sendMessage(user, payload || {});
      ack({ ok: true, message });
    } catch (err) {
      ack({ ok: false, error: { code: err.code || 'ERREUR', message: err.status ? err.message : 'Envoi impossible. Réessayez.' } });
    }
  });
  socket.on('typing', (payload) => {
    if (!payload || !mongoose.isValidObjectId(payload.destinataire)) return;
    emitToUser(payload.destinataire, 'typing', { de: String(user._id), actif: Boolean(payload.actif) });
  });
}
