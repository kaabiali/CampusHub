import { lazy, Suspense } from 'react';
import { createBrowserRouter, Outlet } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { GuestOnly, RequireAdmin, RequireVerified } from '@/components/layout/guards';
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
import Evenements from '@/pages/evenements/Evenements';
import EvenementDetail from '@/pages/evenements/EvenementDetail';
import Messagerie from '@/pages/messages/Messagerie';
import NotFound from '@/pages/NotFound';
import RouteError from '@/pages/RouteError';

// Admin screens pull in the charting library; students never download it.
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const Moderation = lazy(() => import('@/pages/admin/Moderation'));
const Utilisateurs = lazy(() => import('@/pages/admin/Utilisateurs'));
const Referentiels = lazy(() => import('@/pages/admin/Referentiels'));

const admin = (Page) => (
  <RequireAdmin>
    <Suspense fallback={<div className="h-72 rounded-lg bg-muted/70 animate-pulse" aria-busy="true" />}>
      <Page />
    </Suspense>
  </RequireAdmin>
);

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
          { path: 'evenements', element: <Evenements /> },
          { path: 'evenements/:id', element: <EvenementDetail /> },
          { path: 'messages', element: <Messagerie /> },
          { path: 'messages/:uid', element: <Messagerie /> },
          { path: 'admin', element: admin(AdminDashboard) },
          { path: 'admin/moderation', element: admin(Moderation) },
          { path: 'admin/utilisateurs', element: admin(Utilisateurs) },
          { path: 'admin/referentiels', element: admin(Referentiels) },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
