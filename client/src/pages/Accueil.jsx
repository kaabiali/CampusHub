import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, BookOpen, CalendarDays, CarFront, ChevronDown, Plus, Sparkles, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/PageHeader';
import { RideTimeline } from '@/components/rides/RideCard';
import { useNotifications } from '@/components/layout/NotificationBell';
import { useJoinGroup } from '@/hooks/useJoinGroup';
import { useEventRegistration } from '@/hooks/useEventRegistration';
import { get, post } from '@/lib/api';
import { dayLong, dayShort, fullName, plural, price, relative, time } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';

function greeting() {
  const h = Number(new Intl.DateTimeFormat('fr-FR', { hour: 'numeric', timeZone: 'Africa/Tunis' }).format(new Date()));
  return h >= 18 || h < 5 ? 'Bonsoir' : 'Bonjour';
}

function Stat({ to, label, value, hint }) {
  return (
    <Link to={to} className="group flex flex-col gap-1.5 rounded-lg border bg-card px-5 py-4 shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-input hover:shadow-sm">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      {value === undefined ? <span className="h-8 w-10 rounded bg-muted animate-pulse" /> : <span className="text-[28px] leading-none font-semibold tracking-tight">{value}</span>}
      <span className="truncate text-[13px] text-foreground-2 first-letter:uppercase">{hint || ' '}</span>
    </Link>
  );
}

function PublishMenu() {
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Plus /> Publier <ChevronDown className="opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => navigate('/livres?publier=1')}>
          <BookOpen /> Une annonce de livre
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/covoiturage?proposer=1')}>
          <CarFront /> Un trajet
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/groupes?creer=1')}>
          <UsersRound /> Un groupe d’étude
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RecoRow({ icon: Icon, title, to, reason, action }) {
  return (
    <li className="flex items-center gap-4 border-t py-3.5 first:border-t-0">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <Link to={to} className="line-clamp-1 font-semibold hover:underline">
          {title}
        </Link>
        <p className="truncate text-[13px] text-muted-foreground">{reason}</p>
      </div>
      {action}
    </li>
  );
}

function Recommendations() {
  const { user } = useAuth();
  const join = useJoinGroup();
  const registration = useEventRegistration();
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ['recommandations', user.matieres, user.centresInteret], queryFn: () => get('/recommandations'), staleTime: 5 * 60_000 });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['recommandations'] });

  const rows = data
    ? [
        ...data.groupes.slice(0, 2).map((g) => ({ key: g._id, icon: UsersRound, title: g.nom, to: `/groupes/${g._id}`, reason: g.raison, action: <Button size="sm" variant="outline" disabled={join.isPending} onClick={() => join.mutate(g._id, { onSuccess: refresh })}>Rejoindre</Button> })),
        ...data.evenements.slice(0, 2).map((e) => ({ key: e._id, icon: CalendarDays, title: `${e.titre}, ${dayShort(e.dateDebut)}`, to: `/evenements/${e._id}`, reason: e.raison, action: <Button size="sm" variant="outline" disabled={registration.isPending} onClick={() => registration.mutate({ id: e._id, register: true }, { onSuccess: refresh })}>S’inscrire</Button> })),
        ...data.livres.slice(0, 2).map((b) => ({ key: b._id, icon: BookOpen, title: b.titre, to: `/livres/${b._id}`, reason: `${b.raison} · ${price(b.prix)}`, action: <Button size="sm" variant="ghost" asChild><Link to={`/livres/${b._id}`}>Voir</Link></Button> })),
      ]
    : [];

  return (
    <section className="flex flex-col gap-2 rounded-lg border bg-card p-5 shadow-xs sm:p-6" aria-labelledby="reco">
      <h2 id="reco" className="flex items-center gap-2 text-lg font-semibold">
        <Sparkles className="size-5 text-primary" strokeWidth={1.75} /> Recommandé pour vous
      </h2>
      {isPending ? (
        <div className="flex flex-col gap-3 pt-2">{Array.from({ length: 3 }, (_, i) => <div key={i} className="h-12 rounded-md bg-muted/70 animate-pulse" />)}</div>
      ) : !user.matieres.length && !user.centresInteret.length ? (
        <div className="flex flex-col items-start gap-3 py-2">
          <p className="text-sm text-foreground-2">Ajoutez vos matières et centres d’intérêt : nous vous proposerons les groupes, événements et livres qui vous concernent.</p>
          <Button asChild size="sm">
            <Link to="/profil">
              Compléter mon profil <ArrowRight />
            </Link>
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">Rien de nouveau pour vos matières pour l’instant. Revenez quand les clubs et étudiants auront publié.</p>
      ) : (
        <ul>
          {rows.map(({ key, ...r }) => (
            <RecoRow key={key} {...r} />
          ))}
        </ul>
      )}
    </section>
  );
}

function NextRide({ summary }) {
  const ride = summary?.prochainTrajet || summary?.prochainConduit;
  const driving = !summary?.prochainTrajet && Boolean(summary?.prochainConduit);
  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-card p-5 shadow-xs sm:p-6" aria-labelledby="trajet">
      <div className="flex items-center justify-between gap-3">
        <h2 id="trajet" className="text-lg font-semibold">
          {driving ? 'Mon prochain trajet (conducteur)' : 'Mon prochain trajet'}
        </h2>
        <Link to="/covoiturage?vue=mes-trajets" className="text-sm font-semibold text-primary hover:underline">
          Tous les trajets
        </Link>
      </div>
      {!summary ? (
        <div className="h-16 rounded-md bg-muted/70 animate-pulse" />
      ) : ride ? (
        <Link to={`/covoiturage/${ride._id}`} className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-md transition-colors">
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-sm text-muted-foreground first-letter:uppercase">{dayLong(ride.dateDepart)}</p>
            <RideTimeline ride={ride} />
          </div>
          <span className="rounded-md bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
            {driving ? `${ride.placesTotales - ride.placesDisponibles}/${ride.placesTotales} réservées` : `Avec ${fullName(ride.conducteur)}`}
          </span>
        </Link>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aucun trajet prévu.{' '}
          <Link to="/covoiturage" className="font-medium text-primary hover:underline">
            Trouver un trajet
          </Link>
        </p>
      )}
    </section>
  );
}

function Notifications() {
  const { data } = useNotifications();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const readAll = useMutation({ mutationFn: () => post('/notifications/lues', {}), onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }) });
  return (
    <section className="flex flex-col gap-1 rounded-lg border bg-card p-5 shadow-xs sm:p-6" aria-labelledby="notifs">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id="notifs" className="text-lg font-semibold">
          Notifications
        </h2>
        {data?.nonLues > 0 && (
          <button type="button" className="text-[13px] font-semibold text-primary hover:underline" onClick={() => readAll.mutate()}>
            Tout marquer comme lu
          </button>
        )}
      </div>
      {!data ? (
        Array.from({ length: 4 }, (_, i) => <div key={i} className="my-1 h-12 rounded-md bg-muted/70 animate-pulse" />)
      ) : data.notifications.length === 0 ? (
        <p className="text-sm text-muted-foreground">Rien de nouveau. Les réservations, messages et rappels apparaîtront ici.</p>
      ) : (
        data.notifications.slice(0, 6).map((n) => (
          <button
            key={n._id}
            type="button"
            onClick={() => n.lien && navigate(n.lien)}
            className={cn('rounded-md px-3 py-2.5 text-left transition-colors duration-200 hover:bg-accent', !n.lue && 'bg-primary-soft/70')}
          >
            <span className="block text-sm leading-snug">{n.contenu}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{relative(n.dateCreation)}</span>
          </button>
        ))
      )}
    </section>
  );
}

export default function Accueil() {
  const { user } = useAuth();
  const { data: summary } = useQuery({ queryKey: ['accueil'], queryFn: () => get('/accueil') });

  return (
    <>
      <PageHeader title={`${greeting()} ${user.prenom}`} description={`${dayLong(new Date())}. Voici ce qui se passe sur le campus.`}>
        <PublishMenu />
      </PageHeader>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Résumé">
        <Stat to="/livres?vue=mes-annonces" label="Mes annonces actives" value={summary?.annoncesActives} hint={summary && (summary.annoncesActives ? 'Voir mes annonces' : 'Publier un livre')} />
        <Stat to="/covoiturage?vue=mes-trajets" label="Trajets réservés" value={summary?.trajetsReserves} hint={summary?.prochainTrajet && `Prochain ${dayShort(summary.prochainTrajet.dateDepart)}, ${time(summary.prochainTrajet.dateDepart)}`} />
        <Stat to="/groupes" label="Mes groupes" value={summary?.nbGroupes} hint={summary?.prochaineSeance && `Séance ${dayShort(summary.prochaineSeance.date)}, ${time(summary.prochaineSeance.date)}`} />
        <Stat to="/messages" label="Messages non lus" value={summary?.messagesNonLus} hint={summary && (summary.messagesNonLus ? plural(summary.messagesNonLus, 'message') : 'Tout est lu')} />
      </section>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-6">
          <Recommendations />
          <NextRide summary={summary} />
        </div>
        <Notifications />
      </div>
    </>
  );
}
