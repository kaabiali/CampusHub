import { BookOpen, CalendarDays, CarFront, House, MessageCircle, UserRound, UsersRound } from 'lucide-react';

export const NAV = [
  { to: '/accueil', label: 'Accueil', icon: House, keywords: 'tableau de bord dashboard' },
  { to: '/livres', label: 'Livres', icon: BookOpen, keywords: 'marketplace annonces manuels vendre acheter' },
  { to: '/covoiturage', label: 'Covoiturage', icon: CarFront, keywords: 'trajets voiture réserver place conducteur' },
  { to: '/groupes', label: "Groupes d'étude", icon: UsersRound, keywords: 'révision séances documents pdf' },
  { to: '/evenements', label: 'Événements', icon: CalendarDays, keywords: 'clubs inscription agenda' },
  { to: '/messages', label: 'Messagerie', icon: MessageCircle, keywords: 'messages conversations discuter' },
];

export const ADMIN_NAV = [];

export const ACCOUNT_NAV = [{ to: '/profil', label: 'Mon profil', icon: UserRound, keywords: 'compte matières photo mot de passe' }];
