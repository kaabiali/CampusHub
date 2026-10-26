import { useRouteError } from 'react-router';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RouteError() {
  const error = useRouteError();
  if (import.meta.env.DEV) console.error(error);
  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <div className="flex max-w-md flex-col items-start gap-5">
        <span className="flex size-12 items-center justify-center rounded-lg bg-destructive-soft text-destructive">
          <TriangleAlert className="size-6" strokeWidth={1.75} />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Cette page n’a pas pu s’afficher</h1>
          <p className="text-muted-foreground">Une erreur inattendue s’est produite. Rechargez la page ; si le problème persiste, revenez à l’accueil.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>Recharger</Button>
          <Button variant="outline" onClick={() => window.location.assign('/accueil')}>
            Accueil
          </Button>
        </div>
      </div>
    </div>
  );
}
