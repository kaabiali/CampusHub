import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Ban, Flag, MapPin, MessageCircle, Pencil, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
import { RatingBadge, StarRating } from '@/components/StarRating';
import { RideTimeline } from '@/components/rides/RideCard';
import { RideForm } from '@/components/rides/RideForm';
import { RideMap } from '@/components/map/RideMap';
import { useReserve } from '@/hooks/useReserve';
import { del, get, post } from '@/lib/api';
import { dayLong, fullName, plural, price, shortName } from '@/lib/format';
import { useAuth } from '@/providers/AuthProvider';

const RATING_WINDOW = 7 * 864e5;

function Stat({ label, value, mono }) {
  return (
    <div className="rounded-lg border bg-card p-3.5 shadow-xs">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 truncate text-base font-semibold ${mono ? 'font-mono font-normal tabular' : ''}`}>{value || '—'}</p>
    </div>
  );
}

function Confirm({ open, onOpenChange, title, description, confirm, onConfirm }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Retour</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-white hover:bg-destructive/90">
            {confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RateDriver({ ride }) {
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const queryClient = useQueryClient();
  const rate = useMutation({
    mutationFn: () => post(`/reservations/${ride.maReservation._id}/avis`, { note, commentaire }),
    onSuccess: ({ avis }) => {
      queryClient.setQueryData(['trajet', ride._id], { ...ride, monAvis: avis });
      queryClient.invalidateQueries({ queryKey: ['mes-trajets'] });
      toast.success('Merci, votre avis est enregistré.');
    },
    onError: (e) => toast.error(e.message),
  });
  if (ride.monAvis) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-card p-4 text-sm shadow-xs">
        Vous avez noté ce trajet
        <StarRating value={ride.monAvis.note} onChange={() => {}} size="sm" />
      </div>
    );
  }
  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning-soft/50 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        rate.mutate();
      }}
    >
      <p className="font-semibold">Comment s’est passé le trajet avec {ride.conducteur.prenom} ?</p>
      <StarRating value={note} onChange={setNote} />
      <Textarea rows={2} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} maxLength={300} placeholder="Un commentaire (facultatif)" className="bg-card" />
      <Button type="submit" className="self-start" disabled={!note || rate.isPending}>
        Envoyer mon avis
      </Button>
    </form>
  );
}

export default function TrajetDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const reserve = useReserve();
  const [seats, setSeats] = useState('1');
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [reporting, setReporting] = useState(false);

  const { data: ride, isPending, error } = useQuery({ queryKey: ['trajet', id], queryFn: () => get(`/trajets/${id}`).then((r) => r.trajet) });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['trajet', id] });
    queryClient.invalidateQueries({ queryKey: ['trajets'] });
    queryClient.invalidateQueries({ queryKey: ['mes-trajets'] });
  };
  const cancelBooking = useMutation({
    mutationFn: () => del(`/reservations/${ride.maReservation._id}`),
    onSuccess: () => {
      toast.success('Réservation annulée. Le conducteur est prévenu.');
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const cancelRide = useMutation({
    mutationFn: () => post(`/trajets/${id}/annuler`),
    onSuccess: () => {
      toast.success('Trajet annulé. Les passagers sont prévenus.');
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const back = (
    <Link to="/covoiturage" className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" /> Covoiturage
    </Link>
  );
  if (isPending)
    return (
      <>
        {back}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]" aria-busy="true">
          <div className="h-56 rounded-lg bg-muted animate-pulse" />
          <div className="h-56 rounded-lg bg-muted/70 animate-pulse" />
        </div>
      </>
    );
  if (error) return <>{back}<EmptyState icon={TriangleAlert} title="Trajet introuvable" description="Il a peut-être été supprimé." /></>;

  const isDriver = String(ride.conducteur._id) === String(user._id);
  const departed = new Date(ride.dateDepart) <= new Date();
  const live = ['OUVERT', 'COMPLET'].includes(ride.statut) && !departed;
  const canRate = ride.maReservation && departed && ride.statut !== 'ANNULE' && Date.now() - new Date(ride.dateDepart) < RATING_WINDOW;
  const maxSeats = Math.min(ride.placesDisponibles, 4);

  return (
    <>
      {back}
      {ride.statut === 'ANNULE' && (
        <div className="flex items-center gap-2.5 rounded-lg bg-destructive-soft px-4 py-3 text-sm text-destructive" role="status">
          <Ban className="size-4" /> Ce trajet a été annulé par le conducteur.
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-5 rounded-lg border bg-card p-5 shadow-xs sm:p-6">
            <p className="text-sm font-medium text-muted-foreground">{dayLong(ride.dateDepart)}</p>
            <RideTimeline ride={ride} size="lg" />
            <RideMap
              className="border-t pt-4"
              depart={ride.coordDepart}
              arrivee={ride.coordArrivee}
              departLabel={ride.lieuDepart}
              arriveeLabel={ride.lieuArrivee}
              height={280}
            />
            {ride.details && (
              <p className="flex items-start gap-2 border-t pt-4 text-sm text-foreground-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" /> {ride.details}
              </p>
            )}
          </section>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Places" value={ride.placesDisponibles > 0 ? `${ride.placesDisponibles} ${ride.placesDisponibles > 1 ? 'libres' : 'libre'}` : 'Complet'} />
            <Stat label="Prix" value={price(ride.prix)} mono />
            <Stat label="Véhicule" value={ride.vehicule} />
          </div>
          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">Passagers</h2>
            {ride.passagers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Personne n’a encore réservé.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {ride.passagers.map((p) => (
                  <span key={p._id} className={`inline-flex items-center gap-2 rounded-md py-1 pr-3 pl-1 text-sm ${String(p._id) === String(user._id) ? 'bg-primary-soft font-semibold text-primary-soft-foreground' : 'bg-muted'}`}>
                    <UserAvatar user={p} className="size-6 text-[10px]" tone="muted" />
                    {String(p._id) === String(user._id) ? 'Vous' : shortName(p)}
                    {p.nbPlaces > 1 && <span className="text-xs text-muted-foreground">×{p.nbPlaces}</span>}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
          <div className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-xs">
            <UserAvatar user={ride.conducteur} className="size-11" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{isDriver ? 'Vous conduisez' : fullName(ride.conducteur)}</p>
              <p className="text-sm">
                <RatingBadge user={ride.conducteur} />
              </p>
            </div>
            {!isDriver && (
              <Button asChild variant="outline" size="icon" aria-label={`Écrire à ${ride.conducteur.prenom}`}>
                <Link to={`/messages/${ride.conducteur._id}?sujet=TRAJET:${ride._id}`}>
                  <MessageCircle />
                </Link>
              </Button>
            )}
          </div>

          {isDriver ? (
            live && (
              <div className="flex flex-col gap-2">
                <Button onClick={() => setEditing(true)}>
                  <Pencil /> Modifier le trajet
                </Button>
                <Button variant="ghost" className="text-destructive hover:bg-destructive-soft hover:text-destructive" onClick={() => setConfirm('ride')}>
                  <Ban /> Annuler le trajet
                </Button>
              </div>
            )
          ) : ride.maReservation ? (
            <>
              <div className="rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-sm font-semibold text-success">
                Réservation confirmée · {plural(ride.maReservation.nbPlaces, 'place')}
              </div>
              {live && (
                <Button variant="outline" onClick={() => setConfirm('booking')} disabled={cancelBooking.isPending}>
                  Annuler ma réservation
                </Button>
              )}
              {canRate && <RateDriver ride={ride} />}
            </>
          ) : live && ride.placesDisponibles > 0 ? (
            <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-xs">
              {maxSeats > 1 && (
                <label className="flex items-center justify-between gap-3 text-sm font-medium">
                  Nombre de places
                  <Select value={seats} onValueChange={setSeats}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: maxSeats }, (_, i) => (
                        <SelectItem key={i} value={String(i + 1)}>
                          {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              )}
              <Button size="lg" className="h-12 text-base" disabled={reserve.isPending} onClick={() => reserve.mutate({ rideId: ride._id, nbPlaces: Number(seats) })}>
                Réserver {seats === '1' ? 'une place' : `${seats} places`}, {price(ride.prix * Number(seats))}
              </Button>
              <p className="text-center text-xs text-muted-foreground">Paiement en main propre au conducteur.</p>
            </div>
          ) : (
            <p className="rounded-lg bg-muted px-4 py-3 text-sm text-foreground-2">{ride.statut === 'ANNULE' ? 'Trajet annulé.' : departed ? 'Ce trajet est déjà parti.' : 'Ce trajet est complet.'}</p>
          )}

          {!isDriver && (
            <button type="button" onClick={() => setReporting(true)} className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-destructive">
              <Flag className="size-4" /> Signaler ce trajet
            </button>
          )}
          <AdminDeleteButton
            type="TRAJET"
            id={ride._id}
            titre={`${ride.lieuDepart} → ${ride.lieuArrivee}`}
            invalidate={[['trajets'], ['mes-trajets']]}
            onDeleted={() => navigate('/covoiturage')}
            label="Supprimer le trajet"
            className="self-start text-destructive hover:bg-destructive-soft hover:text-destructive"
          />
        </aside>
      </div>

      <Sheet open={editing} onOpenChange={setEditing}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Modifier le trajet</SheetTitle>
            <SheetDescription>Les passagers voient les changements immédiatement.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <RideForm ride={ride} onDone={() => setEditing(false)} />
          </div>
        </SheetContent>
      </Sheet>
      <Confirm
        open={confirm === 'booking'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Annuler votre réservation ?"
        description="Votre place sera remise à disposition et le conducteur prévenu."
        confirm="Annuler la réservation"
        onConfirm={() => cancelBooking.mutate()}
      />
      <Confirm
        open={confirm === 'ride'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Annuler ce trajet ?"
        description={ride.passagers.length ? `${plural(ride.passagers.length, 'passager')} ${ride.passagers.length > 1 ? 'seront prévenus' : 'sera prévenu'}. Cette action est définitive.` : 'Cette action est définitive.'}
        confirm="Annuler le trajet"
        onConfirm={() => cancelRide.mutate()}
      />
      <ReportDialog open={reporting} onOpenChange={setReporting} typeContenu="TRAJET" contenuId={ride._id} />
    </>
  );
}
