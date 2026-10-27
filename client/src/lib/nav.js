import {
  BookOpen,
  CalendarDays,
  CarFront,
  ChartColumn,
  House,
  KeyRound,
  MessageCircle,
  Palette,
  PlugZap,
  Settings,
  ShieldAlert,
  Tags,
  UserRound,
  UserRoundCog,
  UsersRound,
} from 'lucide-react';

// `end` marks an entry that must match its path exactly, so it does not light up on its children's pages.
export const NAV_SECTIONS = [
  { items: [{ to: '/accueil', label: 'Accueil', icon: House, keywords: 'tableau de bord dashboard' }] },
  {
    title: 'Campus',
    items: [
      { to: '/livres', label: 'Livres', icon: BookOpen, keywords: 'marketplace annonces manuels vendre acheter' },
      { to: '/covoiturage', label: 'Covoiturage', icon: CarFront, keywords: 'trajets voiture réserver place conducteur' },
      { to: '/groupes', label: "Groupes d'étude", icon: UsersRound, keywords: 'révision séances documents pdf' },
      { to: '/evenements', label: 'Événements', icon: CalendarDays, keywords: 'clubs inscription agenda' },
    ],
  },
  { title: 'Échanges', items: [{ to: '/messages', label: 'Messagerie', icon: MessageCircle, keywords: 'messages conversations discuter' }] },
];

export const NAV = NAV_SECTIONS.flatMap((s) => s.items);

export const ADMIN_NAV = [
  { to: '/admin', end: true, label: 'Tableau de bord', icon: ChartColumn, keywords: 'statistiques admin analytique' },
  { to: '/admin/moderation', label: 'Modération', icon: ShieldAlert, keywords: 'signalements admin' },
  { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: UserRoundCog, keywords: 'comptes bloquer admin' },
  { to: '/admin/referentiels', label: 'Catégories et clubs', icon: Tags, keywords: 'catégories clubs responsables admin' },
];

export const SETTINGS_SECTIONS = [
  { id: 'profil', label: 'Profil', icon: UserRound, description: 'Photo, filière et matières' },
  { id: 'securite', label: 'Sécurité', icon: KeyRound, description: 'Mot de passe et adresse e-mail' },
  { id: 'apparence', label: 'Apparence', icon: Palette, description: 'Thème et barre latérale' },
  { id: 'integrations', label: 'Intégrations', icon: PlugZap, description: 'Agenda, temps réel et e-mails' },
];

export const ACCOUNT_NAV = [
  { to: '/profil', label: 'Mon profil', icon: UserRound, keywords: 'compte profil public' },
  { to: '/parametres', label: 'Paramètres', icon: Settings, keywords: 'compte réglages photo matières mot de passe' },
  { to: '/parametres/apparence', label: 'Apparence', icon: Palette, keywords: 'thème clair sombre barre latérale' },
  { to: '/parametres/integrations', label: 'Intégrations', icon: PlugZap, keywords: 'agenda google outlook ics calendrier' },
];

// The one entry to highlight: the longest path that covers the current one, so a parent and a child never both light up.
export function resolveActive(items, pathname) {
  let best = null;
  for (const item of items) {
    const covers = pathname === item.to || (!item.end && pathname.startsWith(`${item.to}/`));
    if (covers && (!best || item.to.length > best.to.length)) best = item;
  }
  return best?.to ?? null;
}
