import { Notification } from '../models/Notification.js';
import { logger } from './logger.js';

const listeners = new Set();

// Realtime transports (Socket.io) subscribe here; producers stay unaware of them.
export const onNotification = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const publish = (notification) => {
  for (const fn of listeners) fn(notification);
};

// One unread notification per conversation: a burst of messages refreshes it instead of stacking.
export async function notifyMessage(utilisateur, { contenu, lien }) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { utilisateur, type: 'MESSAGE', lien, lue: false },
      { $set: { contenu, dateCreation: new Date() } },
      { upsert: true, returnDocument: 'after', timestamps: false },
    );
    publish(notification);
    return notification;
  } catch (err) {
    logger.error({ err: err.message }, 'notify_failed');
    return null;
  }
}

export async function notify(utilisateur, { type, contenu, lien = null, cleDedup }) {
  try {
    const notification = await Notification.create({ utilisateur, type, contenu, lien, cleDedup });
    publish(notification);
    return notification;
  } catch (err) {
    if (err.code === 11000) return null;
    // A failed notification must never fail the action that triggered it.
    logger.error({ err: err.message, type }, 'notify_failed');
    return null;
  }
}
