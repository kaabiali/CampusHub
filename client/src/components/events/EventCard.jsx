import { Link } from 'react-router';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dayNum, monthShort, time } from '@/lib/format';
import { cn } from '@/lib/utils';

export function DateBlock({ date, size = 'md', className }) {
  const big = size === 'lg';
  return (
    <div className={cn('flex shrink-0 flex-col items-center justify-center rounded-md border bg-card', big ? 'w-16 py-2' : 'w-[52px] py-1.5', className)}>
      <span className={cn('font-semibold text-primary uppercase', big ? 'text-xs' : 'text-[11px]')}>{monthShort(date)}</span>
      <span className={cn('leading-none font-bold tabular', big ? 'text-3xl' : 'text-xl')}>{dayNum(date)}</span>
    </div>
  );
}

export const placesLabel = (e) => (e.capacite ? `${e.nbInscrits} / ${e.capacite} places` : e.nbInscrits ? `${e.nbInscrits} inscrits · entrée libre` : 'Entrée libre');

export function RegisterButton({ event, onToggle, pending, size = 'sm', className }) {
  const full = event.capacite && event.nbInscrits >= event.capacite;
  if (event.estInscrit) {
    return (
      <Button
        size={size}
        variant="outline"
        className={cn('group/reg border-success/40 bg-success-soft text-success hover:border-destructive/40 hover:bg-destructive-soft hover:text-destructive', className)}
        onClick={() => onToggle(false)}
        disabled={pending}
        aria-label="Inscrit, cliquer pour se désinscrire"
      >
        <Check className="group-hover/reg:hidden" />
        <span className="group-hover/reg:hidden">Inscrit</span>
        <span className="hidden group-hover/reg:inline">Se désinscrire</span>
      </Button>
    );
  }
  return (
    <Button size={size} className={className} disabled={full || pending} onClick={() => onToggle(true)}>
      {full ? 'Complet' : 'S’inscrire'}
    </Button>
  );
}

export function EventCard({ event, onToggle, pending }) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border bg-card p-5 shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-input hover:shadow-sm">
      <div className="flex items-center gap-3.5">
        <DateBlock date={event.dateDebut} />
        <div className="min-w-0">
          <Link to={`/evenements/${event._id}`} className="rounded-sm focus-visible:outline-2 focus-visible:outline-ring">
            <h3 className="line-clamp-2 text-base leading-snug font-semibold tracking-normal hover:underline">{event.titre}</h3>
          </Link>
          <p className="text-[13px] text-muted-foreground">{event.club?.nom}</p>
        </div>
      </div>
      <p className="text-sm text-foreground-2">
        {event.lieu} · {time(event.dateDebut)}
      </p>
      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        <span className="text-[13px] text-muted-foreground tabular">{placesLabel(event)}</span>
        <RegisterButton event={event} onToggle={onToggle} pending={pending} />
      </div>
    </article>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="flex h-[168px] flex-col gap-3 rounded-lg border bg-card p-5" aria-hidden="true">
      <div className="flex gap-3.5">
        <div className="h-[52px] w-[52px] rounded-md bg-muted animate-pulse" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-3 w-1/3 rounded bg-muted/70 animate-pulse" />
        </div>
      </div>
      <div className="mt-auto h-8 rounded bg-muted/70 animate-pulse" />
    </div>
  );
}
