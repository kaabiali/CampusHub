import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { DateBlock } from '@/components/events/EventCard';
import { get } from '@/lib/api';
import { time } from '@/lib/format';
import { useAuth } from '@/providers/AuthProvider';

export function PublicEvents() {
  const { user } = useAuth();
  const { data, isPending } = useQuery({ queryKey: ['evenements', 'publics'], queryFn: () => get('/evenements/publics').then((r) => r.evenements) });
  const target = (path) => (user ? path : `/connexion?retour=${encodeURIComponent(path)}`);

  if (!isPending && !data?.length) return null;
  return (
    <section id="evenements" className="mx-auto flex max-w-[1200px] scroll-mt-20 flex-col gap-6 px-4 pt-20 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Prochains événements publics</h2>
        <Link to={target('/evenements')} className="group inline-flex items-center gap-1.5 font-semibold text-primary">
          Tous les événements <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        {isPending
          ? Array.from({ length: 3 }, (_, i) => <div key={i} className="h-[86px] rounded-lg border bg-card animate-pulse" />)
          : data.slice(0, 4).map((e) => (
              <Link
                key={e._id}
                to={target(`/evenements/${e._id}`)}
                className="group flex items-center gap-5 rounded-lg border bg-card p-4 shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-input hover:shadow-sm sm:px-5"
              >
                <DateBlock date={e.dateDebut} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-semibold group-hover:underline">{e.titre}</p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {e.club?.nom} · {e.lieu} · {time(e.dateDebut)}
                  </p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
              </Link>
            ))}
      </div>
    </section>
  );
}
