import { lazy, Suspense } from 'react';
import { createBrowserRouter, Outlet } from 'react-router';
import { AppShellSkeleton } from '@/components/layout/AppShellSkeleton';
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
import NotFound from '@/pages/NotFound';
import RouteError from '@/pages/RouteError';

// Public and auth pages ship in the main bundle for the fastest first paint; app pages load on demand.
// The router fetches a page's code before switching to it, so navigation never flashes a blank screen.
const page = (load) => async () => ({ Component: (await load()).default });

// The router resolves every matched route's `lazy()` before any guard renders, so admin screens use
// React.lazy instead: their code (and the chart library) is only fetched once RequireAdmin lets them render.
const adminPage = (load) => {
  const Page = lazy(load);
  return (
    <RequireAdmin>
      <Suspense fallback={<div className="h-72 rounded-lg bg-muted/70 animate-pulse" aria-busy="true" />}>
        <Page />
      </Suspense>
    </RequireAdmin>
  );
};

export const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <AppShellSkeleton />,
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
        lazy: async () => {
          const { AppShell } = await import('@/components/layout/AppShell');
          return {
            Component: () => (
              <RequireVerified>
                <AppShell />
              </RequireVerified>
            ),
          };
        },
        children: [
          { path: 'accueil', lazy: page(() => import('@/pages/Accueil')) },
          { path: 'profil', lazy: page(() => import('@/pages/Profil')) },
          { path: 'livres', lazy: page(() => import('@/pages/livres/Livres')) },
          { path: 'livres/:id', lazy: page(() => import('@/pages/livres/LivreDetail')) },
          { path: 'covoiturage', lazy: page(() => import('@/pages/covoiturage/Covoiturage')) },
          { path: 'covoiturage/:id', lazy: page(() => import('@/pages/covoiturage/TrajetDetail')) },
          { path: 'groupes', lazy: page(() => import('@/pages/groupes/Groupes')) },
          { path: 'groupes/:id', lazy: page(() => import('@/pages/groupes/GroupeDetail')) },
          { path: 'evenements', lazy: page(() => import('@/pages/evenements/Evenements')) },
          { path: 'evenements/:id', lazy: page(() => import('@/pages/evenements/EvenementDetail')) },
          { path: 'messages', lazy: page(() => import('@/pages/messages/Messagerie')) },
          { path: 'messages/:uid', lazy: page(() => import('@/pages/messages/Messagerie')) },
          { path: 'admin', element: adminPage(() => import('@/pages/admin/AdminDashboard')) },
          { path: 'admin/moderation', element: adminPage(() => import('@/pages/admin/Moderation')) },
          { path: 'admin/utilisateurs', element: adminPage(() => import('@/pages/admin/Utilisateurs')) },
          { path: 'admin/referentiels', element: adminPage(() => import('@/pages/admin/Referentiels')) },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
