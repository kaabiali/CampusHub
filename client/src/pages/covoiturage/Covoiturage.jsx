import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CarFront, Plus, Route, SearchX, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';
import { RideCard, RideCardSkeleton, RideTimeline } from '@/components/rides/RideCard';
import { RideForm } from '@/components/rides/RideForm';
import { useReserve } from '@/hooks/useReserve';
import { get } from '@/lib/api';
import { dayLong, dayShort, fullName, isoDay, plural, price } from '@/lib/format';

const STATUT_LABEL = { OUVERT: 'Ouvert', COMPLET: 'Complet', ANNULE: 'Annulé', TERMINE: 'Terminé' };

function SearchView() {
  const [params, setParams] = useSearchParams();
  const [draft, setDraft] = useState({ depart: params.get('depart') || '', arrivee: params.get('arrivee') || '', date: params.get('date') || '' });
  const reserve = useReserve();
  const page = Number(params.get('page')) || 1;
  const filters = { depart: params.get('depart') || undefined, arrivee: params.get('arrivee') || undefined, date: params.get('date') || undefined, page, limit: 10 };

  const { data, isPending, isError, refetch } = useQuery({ queryKey: ['trajets', filters], queryFn: () => get('/trajets', filters), placeholderData: keepPreviousData });

  const submit = (e) => {
    e.preventDefault();
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(draft)) v.trim() ? next.set(k, v.trim()) : next.delete(k);
      next.delete('page');
      return next;
    });
  };
  const filtered = Boolean(filters.depart || filters.arrivee || filters.date);
  const heading = filters.date ? `${data ? plural(data.total, 'trajet') : ''} ${dayLong(`${filters.date}T12:00:00+01:00`).toLowerCase()}` : data && plural(data.total, 'trajet à venir', 'trajets à venir');

  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label="Trajets disponibles">
      <form onSubmit={submit} className="grid gap-3 rounded-lg border bg-card p-4 shadow-xs sm:grid-cols-[1fr_1fr_160px_auto] sm:items-end">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground-2">
          Départ
          <Input value={draft.depart} onChange={(e) => setDraft((d) => ({ ...d, depart: e.target.value }))} placeholder="La Marsa" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground-2">
          Arrivée
          <Input value={draft.arrivee} onChange={(e) => setDraft((d) => ({ ...d, arrivee: e.target.value }))} placeholder="Campus" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground-2">
          Date
          <Input type="date" min={isoDay()} value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} />
        </label>
        <Button type="submit" variant="secondary" className="bg-foreground text-background hover:bg-foreground/90">
          Rechercher
        </Button>
      </form>
      <p className="min-h-5 text-sm text-muted-foreground first-letter:uppercase" aria-live="polite">
        {heading}
      </p>
      {isError ? (
        <EmptyState icon={SearchX} title="Impossible de charger les trajets" description="Vérifiez votre connexion puis réessayez." action={<Button variant="outline" onClick={() => refetch()}>Réessayer</Button>} />
      ) : isPending ? (
        Array.from({ length: 4 }, (_, i) => <RideCardSkeleton key={i} />)
      ) : data.trajets.length === 0 ? (
        <EmptyState
          icon={Route}
          title={filtered ? 'Aucun trajet pour cette recherche' : 'Aucun trajet proposé pour le moment'}
          description={filtered ? 'Essayez une autre date ou un lieu plus large, ou proposez vous-même ce trajet.' : 'Proposez le vôtre : les étudiants qui font le même chemin pourront réserver.'}
        />
      ) : (
        data.trajets.map((r) => <RideCard key={r._id} ride={r} reserving={reserve.isPending && reserve.variables?.rideId === r._id} onReserve={() => reserve.mutate({ rideId: r._id })} />)
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={(p) => setParams((prev) => { const n = new URLSearchParams(prev); n.set('page', p); return n; })} />}
    </section>
  );
}

function RideRow({ ride, children, extra }) {
  return (
    <Link to={`/covoiturage/${ride._id}`} className="grid gap-3 rounded-lg border bg-card p-4 shadow-xs transition-colors hover:border-input sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-center">
      <span className="text-sm font-medium first-letter:uppercase">{dayShort(ride.dateDepart)}</span>
      <RideTimeline ride={ride} />
      <div className="flex items-center gap-3 text-sm">
        {extra}
        {children}
      </div>
    </Link>
  );
}

function MyRides() {
  const { data, isPending } = useQuery({ queryKey: ['mes-trajets'], queryFn: () => get('/trajets/mes-trajets') });
  if (isPending) return <div className="flex flex-col gap-3">{Array.from({ length: 3 }, (_, i) => <RideCardSkeleton key={i} />)}</div>;
  const now = Date.now();
  const toRate = data.reservations.filter((r) => !r.avisDonne && r.trajet.statut !== 'ANNULE' && new Date(r.trajet.dateDepart) < now && now - new Date(r.trajet.dateDepart) < 7 * 864e5);

  return (
    <div className="flex flex-col gap-8">
      {toRate.length > 0 && (
        <section className="flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning-soft/60 p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Star className="size-4 fill-warning text-warning" /> Notez vos derniers trajets
          </h2>
          {toRate.map((r) => (
            <Link key={r._id} to={`/covoiturage/${r.trajet._id}`} className="flex items-center justify-between gap-3 rounded-md bg-card px-3 py-2.5 text-sm hover:shadow-xs">
              <span>
                {r.trajet.lieuDepart} → {r.trajet.lieuArrivee} avec <strong className="font-semibold">{fullName(r.trajet.conducteur)}</strong>
              </span>
              <span className="font-medium text-primary">Noter</span>
            </Link>
          ))}
        </section>
      )}
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Mes réservations</h2>
        {data.reservations.length === 0 ? (
          <EmptyState icon={CarFront} title="Aucune réservation" description="Réservez une place sur un trajet vers le campus." />
        ) : (
          data.reservations.map((r) => (
            <RideRow key={r._id} ride={r.trajet} extra={<span className="text-muted-foreground">{fullName(r.trajet.conducteur)}</span>}>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">{r.trajet.statut === 'ANNULE' ? 'Annulé' : plural(r.nbPlaces, 'place')}</span>
            </RideRow>
          ))
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Trajets que je propose</h2>
        {data.conduits.length === 0 ? (
          <EmptyState icon={Route} title="Vous ne proposez aucun trajet" description="Partagez vos frais d’essence avec les étudiants qui font le même chemin." />
        ) : (
          data.conduits.map((r) => (
            <RideRow key={r._id} ride={r} extra={<span className="font-mono tabular">{price(r.prix)}</span>}>
              <span className="text-muted-foreground">{r.placesTotales - r.placesDisponibles}/{r.placesTotales} réservées</span>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">{STATUT_LABEL[r.statut]}</span>
            </RideRow>
          ))
        )}
      </section>
    </div>
  );
}

export default function Covoiturage() {
  const [params, setParams] = useSearchParams();
  const mine = params.get('vue') === 'mes-trajets';
  const formRef = useRef(null);
  const firstFieldRef = useRef(null);

  useEffect(() => {
    if (params.get('proposer') === '1') focusForm();
  }, []);

  const focusForm = () => {
    if (mine) setParams({});
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      firstFieldRef.current?.focus({ preventScroll: true });
    });
  };

  return (
    <>
      <PageHeader title="Covoiturage" description="Partagez le trajet vers le campus et divisez les frais.">
        <Button onClick={focusForm} className="lg:hidden">
          <Plus /> Proposer un trajet
        </Button>
      </PageHeader>
      <Tabs value={mine ? 'mine' : 'search'} onValueChange={(v) => setParams(v === 'mine' ? { vue: 'mes-trajets' } : {})}>
        <TabsList>
          <TabsTrigger value="search">Rechercher</TabsTrigger>
          <TabsTrigger value="mine">Mes trajets</TabsTrigger>
        </TabsList>
      </Tabs>
      {mine ? (
        <MyRides />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <SearchView />
          <section ref={formRef} className="scroll-mt-20 rounded-lg border bg-card p-5 shadow-xs lg:sticky lg:top-20" aria-labelledby="proposer">
            <h2 id="proposer" className="mb-4 text-lg font-semibold">
              Proposer un trajet
            </h2>
            <RideForm compact firstFieldRef={firstFieldRef} />
          </section>
        </div>
      )}
    </>
  );
}
