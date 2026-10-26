import { BookOpen, CalendarDays, CarFront, ChartColumn, House, MessageCircle, ShieldAlert, Tags, UserRound, UserRoundCog, UsersRound } from 'lucide-react';

export const NAV = [
  { to: '/accueil', label: 'Accueil', icon: House, keywords: 'tableau de bord dashboard' },
  { to: '/livres', label: 'Livres', icon: BookOpen, keywords: 'marketplace annonces manuels vendre acheter' },
  { to: '/covoiturage', label: 'Covoiturage', icon: CarFront, keywords: 'trajets voiture réserver place conducteur' },
  { to: '/groupes', label: "Groupes d'étude", icon: UsersRound, keywords: 'révision séances documents pdf' },
  { to: '/evenements', label: 'Événements', icon: CalendarDays, keywords: 'clubs inscription agenda' },
  { to: '/messages', label: 'Messagerie', icon: MessageCircle, keywords: 'messages conversations discuter' },
];

export const ADMIN_NAV = [
  { to: '/admin', label: 'Tableau de bord', icon: ChartColumn, keywords: 'statistiques admin analytique' },
  { to: '/admin/moderation', label: 'Modération', icon: ShieldAlert, keywords: 'signalements admin' },
  { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: UserRoundCog, keywords: 'comptes bloquer admin' },
  { to: '/admin/referentiels', label: 'Catégories et clubs', icon: Tags, keywords: 'catégories clubs responsables admin' },
];

export const ACCOUNT_NAV = [{ to: '/profil', label: 'Mon profil', icon: UserRound, keywords: 'compte matières photo mot de passe' }];
