import { Notification } from '../models/Notification.js';
import { logger } from './logger.js';

const listeners = new Set();

// Realtime transports (Socket.io) subscribe here; producers stay unaware of them.
export const onNotification = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export async function notify(utilisateur, { type, contenu, lien = null, cleDedup }) {
  try {
    const notification = await Notification.create({ utilisateur, type, contenu, lien, cleDedup });
    for (const fn of listeners) fn(notification);
    return notification;
  } catch (err) {
    if (err.code === 11000) return null;
    // A failed notification must never fail the action that triggered it.
    logger.error({ err: err.message, type }, 'notify_failed');
    return null;
  }
}
