import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CalendarDays, CalendarX, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';
import { EventCard, EventCardSkeleton, RegisterButton, placesLabel } from '@/components/events/EventCard';
import { EventFormSheet, useMyClubs } from '@/components/events/EventFormSheet';
import { useEventRegistration } from '@/hooks/useEventRegistration';
import { get } from '@/lib/api';
import { dayLong, dayNum, monthShort, time } from '@/lib/format';

const FILTERS = { tous: 'Tous', 'mes-inscriptions': 'Mes inscriptions', 'ce-mois': 'Ce mois-ci' };
const FEATURE_WINDOW = 14 * 864e5;

// The most-awaited event of the next two weeks gets the banner.
function pickFeatured(events) {
  const soon = events.filter((e) => new Date(e.dateDebut) - Date.now() < FEATURE_WINDOW);
  return soon.sort((a, b) => b.nbInscrits - a.nbInscrits)[0] || null;
}

function Featured({ event, onToggle, pending }) {
  return (
    <section className="relative flex flex-col gap-6 overflow-hidden rounded-xl bg-brand p-6 text-white sm:flex-row sm:items-center sm:p-8" aria-label="À la une">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.1]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px', maskImage: 'linear-gradient(90deg, transparent 30%, black)' }}
        aria-hidden="true"
      />
      <div className="relative flex size-24 shrink-0 flex-col items-center justify-center rounded-lg bg-white/12 ring-1 ring-white/20">
        <span className="text-sm font-semibold text-white/80 uppercase">{monthShort(event.dateDebut)}</span>
        <span className="text-4xl leading-none font-bold tabular">{dayNum(event.dateDebut)}</span>
      </div>
      <div className="relative flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-white/75">{event.club?.nom} · À la une</span>
        <Link to={`/evenements/${event._id}`} className="rounded-sm focus-visible:outline-2 focus-visible:outline-white">
          <h2 className="text-2xl font-semibold hover:underline sm:text-[28px]">{event.titre}</h2>
        </Link>
        <span className="text-[15px] text-white/80">
          {event.lieu}, {dayLong(event.dateDebut).toLowerCase()} à {time(event.dateDebut)}
        </span>
        <span className="font-mono text-sm text-white/90 tabular">{placesLabel(event)}</span>
      </div>
      <RegisterButton event={event} onToggle={onToggle} pending={pending} size="lg" className="relative h-11 bg-white px-5 text-ink hover:bg-white/90" />
    </section>
  );
}

export default function Evenements() {
  const [params, setParams] = useSearchParams();
  const [publishing, setPublishing] = useState(false);
  const filtre = params.get('filtre') || 'tous';
  const page = Number(params.get('page')) || 1;
  const registration = useEventRegistration();
  const { data: myClubs = [] } = useMyClubs();

  const filters = { filtre, page, limit: 12 };
  const { data, isPending, isError, refetch } = useQuery({ queryKey: ['evenements', filters], queryFn: () => get('/evenements', filters), placeholderData: keepPreviousData });
  const toggle = (e) => (register) => registration.mutate({ id: e._id, register });
  const pending = (e) => registration.isPending && registration.variables?.id === e._id;
  const featured = filtre === 'tous' && page === 1 && data ? pickFeatured(data.evenements) : null;

  return (
    <>
      <PageHeader title="Événements" description="Activités des clubs du campus. Un rappel est envoyé la veille.">
        {myClubs.length > 0 && (
          <Button variant="outline" onClick={() => setPublishing(true)}>
            <Plus /> Publier pour mon club
          </Button>
        )}
      </PageHeader>
      {featured && <Featured event={featured} onToggle={toggle(featured)} pending={pending(featured)} />}
      <ToggleGroup type="single" value={filtre} onValueChange={(v) => v && setParams(v === 'tous' ? {} : { filtre: v })} aria-label="Filtrer les événements" className="justify-start gap-1.5">
        {Object.entries(FILTERS).map(([v, l]) => (
          <ToggleGroupItem key={v} value={v} className="h-8 rounded-full border border-input px-3.5 text-[13px] data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-background">
            {l}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {isError ? (
        <EmptyState icon={CalendarX} title="Impossible de charger les événements" description="Vérifiez votre connexion puis réessayez." action={<Button variant="outline" onClick={() => refetch()}>Réessayer</Button>} />
      ) : isPending ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">{Array.from({ length: 6 }, (_, i) => <EventCardSkeleton key={i} />)}</div>
      ) : data.evenements.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={filtre === 'mes-inscriptions' ? 'Aucune inscription à venir' : 'Aucun événement à venir'}
          description={filtre === 'mes-inscriptions' ? 'Inscrivez-vous à un événement pour le retrouver ici.' : 'Les clubs n’ont rien publié pour cette période.'}
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {data.evenements.map((e) => (
            <EventCard key={e._id} event={e} onToggle={toggle(e)} pending={pending(e)} />
          ))}
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={(p) => setParams((prev) => { const n = new URLSearchParams(prev); n.set('page', p); return n; })} />}
      <EventFormSheet open={publishing} onOpenChange={setPublishing} />
    </>
  );
}
