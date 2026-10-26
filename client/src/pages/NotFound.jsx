import { Link } from 'react-router';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Brand } from '@/components/Brand';
import { useAuth } from '@/providers/AuthProvider';

export default function NotFound({ title = 'Page introuvable', message = 'Cette adresse ne correspond à aucune page de CampusHub. Le lien est peut-être ancien ou mal copié.' }) {
  const { user } = useAuth() || {};
  return (
    <div className="flex min-h-dvh flex-col px-5 py-8 sm:px-10">
      <Brand />
      <main className="flex flex-1 items-center justify-center">
        <div className="flex max-w-md flex-col items-start gap-5 animate-fade-up">
          <span className="flex size-12 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
            <Compass className="size-6" strokeWidth={1.75} />
          </span>
          <div className="flex flex-col gap-2">
            <p className="font-mono text-sm text-muted-foreground">404</p>
            <h1 className="text-3xl font-semibold">{title}</h1>
            <p className="text-muted-foreground">{message}</p>
          </div>
          <Button asChild>
            <Link to={user ? '/accueil' : '/'}>{user ? 'Retour à l’accueil' : 'Retour au site'}</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
