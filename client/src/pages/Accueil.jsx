import { Link } from 'react-router';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { dayLong } from '@/lib/format';
import { useAuth } from '@/providers/AuthProvider';

function greeting() {
  const h = Number(new Intl.DateTimeFormat('fr-FR', { hour: 'numeric', timeZone: 'Africa/Tunis' }).format(new Date()));
  return h >= 18 || h < 5 ? 'Bonsoir' : 'Bonjour';
}

export default function Accueil() {
  const { user } = useAuth();
  const needsProfile = !user.matieres.length;

  return (
    <>
      <PageHeader title={`${greeting()} ${user.prenom}`} description={`${dayLong(new Date())}. Voici ce qui se passe sur le campus.`} />
      {needsProfile && (
        <section className="flex flex-col gap-4 rounded-lg border border-primary/20 bg-primary-soft/60 p-5 sm:flex-row sm:items-center">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-5" strokeWidth={1.75} />
          </span>
          <div className="flex-1">
            <p className="font-semibold">Ajoutez vos matières</p>
            <p className="text-sm text-foreground-2">Les recommandations de groupes, livres et événements se basent sur vos matières et centres d’intérêt.</p>
          </div>
          <Button asChild>
            <Link to="/profil">
              Compléter mon profil <ArrowRight />
            </Link>
          </Button>
        </section>
      )}
    </>
  );
}
