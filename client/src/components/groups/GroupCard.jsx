import { Link } from 'react-router';
import { CalendarClock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dayShort, time } from '@/lib/format';

export function CapacityBar({ value, max }) {
  const ratio = Math.min(1, value / max);
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className={`h-full rounded-full ${ratio >= 1 ? 'bg-warning' : 'bg-primary'}`} style={{ width: `${ratio * 100}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular">
        {value}/{max} membres
      </span>
    </div>
  );
}

export function GroupCard({ group, onJoin, joining }) {
  const full = group.nbMembres >= group.capaciteMax;
  return (
    <article className="flex flex-col gap-3 rounded-lg border bg-card p-5 shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-input hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-soft-foreground">{group.matiere}</span>
        {group.estMembre && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
            <Check className="size-3.5" /> Membre
          </span>
        )}
      </div>
      <Link to={`/groupes/${group._id}`} className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <h3 className="text-base leading-snug font-semibold tracking-normal hover:underline">{group.nom}</h3>
      </Link>
      {group.description && <p className="line-clamp-2 text-sm text-muted-foreground">{group.description}</p>}
      <CapacityBar value={group.nbMembres} max={group.capaciteMax} />
      <div className="mt-auto flex items-center justify-between gap-3 border-t pt-3 text-[13px] text-foreground-2">
        {group.prochaineSeance ? (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <CalendarClock className="size-4 shrink-0 text-primary" />
            <span className="truncate first-letter:uppercase">
              {dayShort(group.prochaineSeance.date)}, {time(group.prochaineSeance.date)}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">Aucune séance prévue</span>
        )}
        {!group.estMembre && onJoin && (
          <Button size="sm" variant="outline" disabled={full || joining} onClick={onJoin}>
            {full ? 'Complet' : 'Rejoindre'}
          </Button>
        )}
      </div>
    </article>
  );
}

export function GroupCardSkeleton() {
  return (
    <div className="flex h-[196px] flex-col gap-3 rounded-lg border bg-card p-5" aria-hidden="true">
      <div className="h-5 w-24 rounded bg-muted animate-pulse" />
      <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
      <div className="h-4 w-full rounded bg-muted/70 animate-pulse" />
      <div className="mt-auto h-8 rounded bg-muted/70 animate-pulse" />
    </div>
  );
}
