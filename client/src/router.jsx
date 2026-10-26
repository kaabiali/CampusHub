import { createBrowserRouter, Outlet } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { GuestOnly, RequireVerified } from '@/components/layout/guards';
import Landing from '@/pages/Landing';
import Confidentialite from '@/pages/Confidentialite';
import Connexion from '@/pages/auth/Connexion';
import Inscription from '@/pages/auth/Inscription';
import MotDePasseOublie from '@/pages/auth/MotDePasseOublie';
import Reinitialiser from '@/pages/auth/Reinitialiser';
import VerifierEmail from '@/pages/auth/VerifierEmail';
import Accueil from '@/pages/Accueil';
import Profil from '@/pages/Profil';
import Livres from '@/pages/livres/Livres';
import LivreDetail from '@/pages/livres/LivreDetail';
import Covoiturage from '@/pages/covoiturage/Covoiturage';
import TrajetDetail from '@/pages/covoiturage/TrajetDetail';
import Groupes from '@/pages/groupes/Groupes';
import GroupeDetail from '@/pages/groupes/GroupeDetail';
import NotFound from '@/pages/NotFound';
import RouteError from '@/pages/RouteError';

export const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <RouteError />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { index: true, element: <Landing /> },
          { path: 'confidentialite', element: <Confidentialite /> },
        ],
      },
      {
        element: (
          <GuestOnly>
            <AuthLayout />
          </GuestOnly>
        ),
        children: [
          { path: 'connexion', element: <Connexion /> },
          { path: 'inscription', element: <Inscription /> },
          { path: 'mot-de-passe-oublie', element: <MotDePasseOublie /> },
        ],
      },
      {
        element: <AuthLayout />,
        children: [
          { path: 'verifier-email', element: <VerifierEmail /> },
          { path: 'reinitialiser', element: <Reinitialiser /> },
        ],
      },
      {
        element: (
          <RequireVerified>
            <AppShell />
          </RequireVerified>
        ),
        children: [
          { path: 'accueil', element: <Accueil /> },
          { path: 'profil', element: <Profil /> },
          { path: 'livres', element: <Livres /> },
          { path: 'livres/:id', element: <LivreDetail /> },
          { path: 'covoiturage', element: <Covoiturage /> },
          { path: 'covoiturage/:id', element: <TrajetDetail /> },
          { path: 'groupes', element: <Groupes /> },
          { path: 'groupes/:id', element: <GroupeDetail /> },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
