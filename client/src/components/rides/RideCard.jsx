import { Link } from 'react-router';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { RatingBadge } from '@/components/StarRating';
import { addMinutes, fullName, plural, price, time } from '@/lib/format';
import { useAuth } from '@/providers/AuthProvider';

export function RideTimeline({ ride, size = 'md' }) {
  const big = size === 'lg';
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center pt-1.5" aria-hidden="true">
        <span className={`rounded-full border-2 border-primary ${big ? 'size-3' : 'size-2.5'}`} />
        <span className={`w-0.5 flex-1 bg-input ${big ? 'min-h-8' : 'min-h-5'}`} />
        <span className={`rounded-full bg-primary ${big ? 'size-3' : 'size-2.5'}`} />
      </div>
      <div className={`flex min-w-0 flex-1 flex-col ${big ? 'gap-6' : 'gap-3'}`}>
        <div className="flex items-baseline gap-3">
          <span className={`font-mono tabular ${big ? 'text-base' : 'text-[15px]'}`}>{time(ride.dateDepart)}</span>
          <strong className={`truncate font-semibold ${big ? 'text-base' : 'text-[15px]'}`}>{ride.lieuDepart}</strong>
        </div>
        <div className="flex items-baseline gap-3">
          <span className={`font-mono tabular text-muted-foreground ${big ? 'text-base' : 'text-[15px]'}`}>{ride.dureeMinutes ? time(addMinutes(ride.dateDepart, ride.dureeMinutes)) : '--:--'}</span>
          <strong className={`truncate font-semibold ${big ? 'text-base' : 'text-[15px]'}`}>{ride.lieuArrivee}</strong>
        </div>
      </div>
    </div>
  );
}

export function RideCard({ ride, onReserve, reserving }) {
  const { user } = useAuth();
  const mine = String(ride.conducteur._id) === String(user._id);
  const full = ride.placesDisponibles <= 0;

  let action;
  if (mine) action = <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-foreground-2">Votre trajet</span>;
  else if (ride.maReservation)
    action = (
      <span className="inline-flex h-9 min-w-[104px] items-center justify-center gap-1.5 rounded-md border border-success/30 bg-success-soft px-3 text-sm font-semibold text-success">
        <Check className="size-4" /> Réservé
      </span>
    );
  else
    action = (
      <Button className="min-w-[104px]" disabled={full || reserving} onClick={onReserve}>
        {full ? 'Complet' : 'Réserver'}
      </Button>
    );

  return (
    <article className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-input hover:shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <Link to={`/covoiturage/${ride._id}`} className="min-w-0 flex-1 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <RideTimeline ride={ride} />
          <span className="sr-only">Voir le détail du trajet</span>
        </Link>
        <span className="font-mono text-lg tabular">{price(ride.prix)}</span>
      </div>
      <div className="flex items-center justify-between gap-3 border-t pt-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <UserAvatar user={ride.conducteur} tone="muted" className="size-8" />
          <div className="min-w-0 text-sm">
            <p className="truncate font-semibold">{fullName(ride.conducteur)}</p>
            <p className="flex flex-wrap items-center gap-x-1.5 text-[13px]">
              <RatingBadge user={ride.conducteur} />
              <span className="text-muted-foreground">· {full ? 'Complet' : `${plural(ride.placesDisponibles, 'place')} ${ride.placesDisponibles > 1 ? 'libres' : 'libre'}`}</span>
            </p>
          </div>
        </div>
        {action}
      </div>
    </article>
  );
}

export function RideCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-5" aria-hidden="true">
      <div className="flex justify-between gap-4">
        <div className="flex flex-col gap-3">
          <div className="h-4 w-48 rounded bg-muted animate-pulse" />
          <div className="h-4 w-40 rounded bg-muted/70 animate-pulse" />
        </div>
        <div className="h-6 w-14 rounded bg-muted animate-pulse" />
      </div>
      <div className="flex items-center justify-between border-t pt-3.5">
        <div className="h-8 w-44 rounded bg-muted/70 animate-pulse" />
        <div className="h-9 w-24 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}
