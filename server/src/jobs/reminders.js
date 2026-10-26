import { Event, Registration } from '../models/Event.js';
import { User } from '../models/User.js';
import { notify } from '../lib/notify.js';
import { sendMail } from '../lib/mailer.js';
import { formatDateFr } from '../lib/time.js';
import { config } from '../config.js';

const WINDOW_MS = 24 * 3600 * 1000;

export async function sendEventReminders(now = new Date()) {
  const events = await Event.find({ statut: 'PUBLIE', dateDebut: { $gt: now, $lte: new Date(now.getTime() + WINDOW_MS) } })
    .populate('club', 'nom')
    .lean();
  let sent = 0;
  for (const event of events) {
    const pending = await Registration.find({ evenement: event._id, rappelEnvoye: false }).select('_id utilisateur').lean();
    for (const reg of pending) {
      // Claim the reminder atomically: only the run that flips the flag sends it.
      const claimed = await Registration.findOneAndUpdate({ _id: reg._id, rappelEnvoye: false }, { rappelEnvoye: true });
      if (!claimed) continue;
      const when = formatDateFr(event.dateDebut);
      await notify(reg.utilisateur, {
        type: 'RAPPEL_EVENEMENT',
        contenu: `Rappel : « ${event.titre} » ${when}, ${event.lieu}.`,
        lien: `/evenements/${event._id}`,
        cleDedup: `rappel:${reg._id}`,
      });
      const user = await User.findById(reg.utilisateur).select('email prenom').lean();
      if (user) {
        await sendMail({
          to: user.email,
          sujet: `Rappel : ${event.titre}`,
          titre: `${event.titre}, c’est bientôt`,
          texte: `Bonjour ${user.prenom}, vous êtes inscrit à « ${event.titre} » (${event.club?.nom}) ${when}, ${event.lieu}.`,
          bouton: "Voir l'événement",
          lien: `${config.clientUrl}/evenements/${event._id}`,
        });
      }
      sent += 1;
    }
  }
  return sent;
}
