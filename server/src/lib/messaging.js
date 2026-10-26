import mongoose from 'mongoose';
import { Message, conversationKey } from '../models/Message.js';
import { User } from '../models/User.js';
import { Book } from '../models/Book.js';
import { Ride } from '../models/Ride.js';
import { Event } from '../models/Event.js';
import { AppError, badRequest, notFound } from './errors.js';
import { emitToUser } from './realtime.js';
import { notifyMessage } from './notify.js';

const CONTEXT_SOURCES = {
  ANNONCE: { model: Book, label: (d) => d.titre },
  TRAJET: { model: Ride, label: (d) => `${d.lieuDepart} → ${d.lieuArrivee}` },
  EVENEMENT: { model: Event, label: (d) => d.titre },
};

async function resolveContext(contexte) {
  if (!contexte?.type || !contexte?.ref) return null;
  const source = CONTEXT_SOURCES[contexte.type];
  if (!source || !mongoose.isValidObjectId(contexte.ref)) throw badRequest('CONTEXTE_INVALIDE', 'Contexte de conversation invalide.');
  const doc = await source.model.findById(contexte.ref).lean();
  if (!doc) throw notFound('L’élément lié à cette conversation n’existe plus.');
  return { type: contexte.type, ref: doc._id, libelle: source.label(doc) };
}

const preview = (text) => (text.length > 80 ? `${text.slice(0, 79)}…` : text);

// Shared by the REST endpoint and the Socket.io handler so both paths behave identically.
export async function sendMessage(sender, { destinataire, contenu, clientId, contexte }) {
  const text = String(contenu ?? '').trim();
  if (!text || text.length > 2000) throw badRequest('MESSAGE_INVALIDE', 'Le message doit contenir entre 1 et 2000 caractères.');
  if (!clientId || String(clientId).length > 64) throw badRequest('MESSAGE_INVALIDE', 'Identifiant de message manquant.');
  if (!mongoose.isValidObjectId(destinataire)) throw badRequest('DESTINATAIRE_INVALIDE', 'Destinataire invalide.');
  if (String(destinataire) === String(sender._id)) throw badRequest('DESTINATAIRE_INVALIDE', 'Vous ne pouvez pas vous écrire à vous-même.');

  const recipient = await User.findOne({ _id: destinataire, estSupprime: false }).select('_id estBloque prenom nom').lean();
  if (!recipient) throw notFound('Destinataire introuvable.');
  if (recipient.estBloque) throw new AppError(403, 'DESTINATAIRE_BLOQUE', "Ce compte n'est plus actif.");

  const existing = await Message.findOne({ expediteur: sender._id, clientId }).lean();
  if (existing) return { message: existing, duplicate: true };

  let message;
  try {
    message = (
      await Message.create({
        expediteur: sender._id,
        destinataire: recipient._id,
        cleConversation: conversationKey(sender._id, recipient._id),
        contenu: text,
        clientId,
        contexte: await resolveContext(contexte),
      })
    ).toObject();
  } catch (err) {
    // A concurrent resend with the same clientId won the race; return the stored message.
    if (err.code === 11000) return { message: await Message.findOne({ expediteur: sender._id, clientId }).lean(), duplicate: true };
    throw err;
  }
  // The live payload carries the sender's name so clients can show it without another request.
  const live = { ...message, auteur: { _id: sender._id, prenom: sender.prenom, nom: sender.nom, photoUrl: sender.photoUrl } };
  emitToUser(recipient._id, 'message:new', live);
  emitToUser(sender._id, 'message:new', live);
  await notifyMessage(recipient._id, { contenu: `${sender.prenom} ${sender.nom} : ${preview(text)}`, lien: `/messages/${sender._id}` });
  return { message, duplicate: false };
}

export async function markRead(reader, otherId) {
  const { modifiedCount } = await Message.updateMany({ expediteur: otherId, destinataire: reader._id, lu: false }, { lu: true });
  if (modifiedCount) emitToUser(otherId, 'messages:lus', { par: String(reader._id) });
  return modifiedCount;
}
