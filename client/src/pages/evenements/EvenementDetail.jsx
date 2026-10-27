import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Ban, Bell, Clock, Flag, MapPin, MessageCircle, Pencil, TriangleAlert, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/EmptyState';
import { ReportDialog } from '@/components/ReportDialog';
import { AdminDeleteButton } from '@/components/admin/AdminDeleteButton';
import { UserAvatar } from '@/components/UserAvatar';
import { CapacityBar } from '@/components/groups/GroupCard';
import { DateBlock, RegisterButton, placesLabel } from '@/components/events/EventCard';
import { EventFormSheet } from '@/components/events/EventFormSheet';
import { useEventRegistration } from '@/hooks/useEventRegistration';
import { get, post } from '@/lib/api';
import { dayLong, fullName, relative, time } from '@/lib/format';
import { useAuth } from '@/providers/AuthProvider';

function Attendees({ open, onOpenChange, eventId }) {
  const { data, isPending } = useQuery({ queryKey: ['evenement', eventId, 'inscrits'], queryFn: () => get(`/evenements/${eventId}/inscrits`).then((r) => r.inscrits), enabled: open });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inscrits</DialogTitle>
          <DialogDescription>{data ? `${data.length} étudiant${data.length > 1 ? 's' : ''}` : 'Chargement…'}</DialogDescription>
        </DialogHeader>
        <ul className="-mx-2 flex max-h-[60vh] flex-col overflow-y-auto">
          {isPending
            ? Array.from({ length: 4 }, (_, i) => <li key={i} className="mx-2 my-1 h-10 rounded bg-muted animate-pulse" />)
            : data.map((u) => (
                <li key={u._id} className="flex items-center gap-3 rounded-md px-2 py-2">
                  <UserAvatar user={u} className="size-8" tone="muted" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{fullName(u)}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{relative(u.dateInscription)}</span>
                </li>
              ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

export default function EvenementDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const registration = useEventRegistration();
  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showAttendees, setShowAttendees] = useState(false);
  const [reporting, setReporting] = useState(false);
  const { data: event, isPending, error } = useQuery({ queryKey: ['evenement', id], queryFn: () => get(`/evenements/${id}`).then((r) => r.evenement) });

  const cancel = useMutation({
    mutationFn: () => post(`/evenements/${id}/annuler`),
    onSuccess: () => {
      toast.success('Événement annulé. Les inscrits sont prévenus.');
      queryClient.invalidateQueries({ queryKey: ['evenement', id] });
      queryClient.invalidateQueries({ queryKey: ['evenements'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const back = (
    <Link to="/evenements" className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" /> Événements
    </Link>
  );
  if (isPending) return <>{back}<div className="h-56 rounded-lg bg-muted animate-pulse" /></>;
  if (error) return <>{back}<EmptyState icon={TriangleAlert} title="Événement introuvable" description="Il a peut-être été supprimé." /></>;

  const past = new Date(event.dateDebut) <= new Date();
  const cancelled = event.statut === 'ANNULE';

  return (
    <>
      {back}
      {cancelled && (
        <div className="flex items-center gap-2.5 rounded-lg bg-destructive-soft px-4 py-3 text-sm text-destructive" role="status">
          <Ban className="size-4" /> Cet événement a été annulé par le club.
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <article className="flex flex-col gap-5 rounded-lg border bg-card p-5 shadow-xs sm:p-7">
          <div className="flex items-start gap-4">
            <DateBlock date={event.dateDebut} size="lg" />
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-sm font-medium text-primary">{event.club.nom}</span>
              <h1 className="text-2xl font-semibold sm:text-3xl">{event.titre}</h1>
            </div>
          </div>
          <dl className="grid gap-2.5 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2 text-foreground-2">
              <Clock className="size-4 text-muted-foreground" />
              <dt className="sr-only">Quand</dt>
              <dd className="first-letter:uppercase">
                {dayLong(event.dateDebut)}, {time(event.dateDebut)}
                {event.dateFin && ` à ${time(event.dateFin)}`}
              </dd>
            </div>
            <div className="flex items-center gap-2 text-foreground-2">
              <MapPin className="size-4 text-muted-foreground" />
              <dt className="sr-only">Lieu</dt>
              <dd>{event.lieu}</dd>
            </div>
          </dl>
          {event.description && <p className="max-w-[65ch] leading-relaxed whitespace-pre-line text-foreground-2">{event.description}</p>}
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            Publié par {fullName(event.organisateur)}
            {!event.peutGerer && (
              <Link to={`/messages/${event.organisateur._id}?sujet=EVENEMENT:${event._id}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                <MessageCircle className="size-3.5" /> Poser une question
              </Link>
            )}
          </p>
        </article>

        <aside className="flex flex-col gap-3 rounded-lg border bg-card p-5 shadow-xs lg:sticky lg:top-20">
          {event.capacite ? <CapacityBar value={event.nbInscrits} max={event.capacite} /> : <p className="text-sm text-muted-foreground">{placesLabel(event)}</p>}
          {!cancelled && !past && (
            <>
              <RegisterButton event={event} size="lg" className="h-11 w-full" onToggle={(register) => registration.mutate({ id: event._id, register })} pending={registration.isPending} />
              {event.estInscrit && (
                <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
                  <Bell className="size-3.5" /> Rappel par notification et e-mail la veille.
                </p>
              )}
            </>
          )}
          {past && !cancelled && <p className="rounded-md bg-muted px-3 py-2 text-sm text-foreground-2">Cet événement a déjà eu lieu.</p>}
          {event.peutGerer && (
            <div className="mt-2 flex flex-col gap-2 border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground">Gestion du club</p>
              <Button variant="outline" onClick={() => setShowAttendees(true)}>
                <Users /> Voir les inscrits
              </Button>
              {!cancelled && !past && (
                <>
                  <Button variant="outline" onClick={() => setEditing(true)}>
                    <Pencil /> Modifier
                  </Button>
                  <Button variant="ghost" className="text-destructive hover:bg-destructive-soft hover:text-destructive" onClick={() => setConfirmCancel(true)}>
                    <Ban /> Annuler l’événement
                  </Button>
                </>
              )}
              {user?.role === 'ADMIN' && (
                <AdminDeleteButton
                  type="EVENEMENT"
                  id={event._id}
                  titre={event.titre}
                  invalidate={[['evenements'], ['evenement', id]]}
                  onDeleted={() => navigate('/evenements')}
                  label="Supprimer définitivement"
                  className="text-destructive hover:bg-destructive-soft hover:text-destructive"
                />
              )}
            </div>
          )}
          {!event.peutGerer && (
            <button type="button" onClick={() => setReporting(true)} className="mt-1 inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-destructive">
              <Flag className="size-4" /> Signaler cet événement
            </button>
          )}
        </aside>
      </div>

      <EventFormSheet open={editing} onOpenChange={setEditing} event={event} />
      <Attendees open={showAttendees} onOpenChange={setShowAttendees} eventId={id} />
      <ReportDialog open={reporting} onOpenChange={setReporting} typeContenu="EVENEMENT" contenuId={event._id} />
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler « {event.titre} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              {event.nbInscrits > 0 ? `Les ${event.nbInscrits} inscrits seront prévenus.` : 'Personne n’est encore inscrit.'} Cette action est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction onClick={() => cancel.mutate()} className="bg-destructive text-white hover:bg-destructive/90">
              Annuler l’événement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
