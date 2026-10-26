import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarPlus, Download, FileText, Lock, MapPin, Pencil, Trash2, TriangleAlert, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Field } from '@/components/Field';
import { FormError } from '@/components/FormError';
import { UserAvatar } from '@/components/UserAvatar';
import { CapacityBar } from '@/components/groups/GroupCard';
import { GroupFormSheet } from '@/components/groups/GroupFormSheet';
import { useJoinGroup } from '@/hooks/useJoinGroup';
import { api, del, get, post } from '@/lib/api';
import { addMinutes, dayShort, fromTunisInput, fullName, monthShort, dayNum, relative, shortName, time, toTunisInput } from '@/lib/format';
import { useAuth } from '@/providers/AuthProvider';

const MAX_PDF = 20 * 1024 * 1024;
const fileSize = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`);

function SessionDialog({ open, onOpenChange, groupId }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => ({ date: toTunisInput(addMinutes(new Date(), 48 * 60)).slice(0, 11) + '14:00', duree: '90', lieu: '', sujet: '' }));
  const create = useMutation({
    mutationFn: () => post(`/groupes/${groupId}/seances`, { ...form, date: fromTunisInput(form.date), duree: Number(form.duree) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupe', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groupes'] });
      toast.success('Séance planifiée.');
      setForm((f) => ({ ...f, lieu: '', sujet: '' }));
      onOpenChange(false);
    },
  });
  const champs = create.error?.champs || {};
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Planifier une séance</DialogTitle>
          <DialogDescription>Visible par tous les membres du groupe.</DialogDescription>
        </DialogHeader>
        <form
          id="session-form"
          className="flex flex-col gap-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <FormError error={create.error} />
          <Field label="Sujet" error={champs.sujet}>
            <Input value={form.sujet} onChange={set('sujet')} placeholder="Ex. Lois continues, exercices du TD 4" required autoFocus />
          </Field>
          <div className="grid grid-cols-[1fr_110px] gap-3">
            <Field label="Date et heure" error={champs.date}>
              <Input type="datetime-local" value={form.date} onChange={set('date')} required />
            </Field>
            <Field label="Durée (min)" error={champs.duree}>
              <Input type="number" min={15} max={480} step={15} value={form.duree} onChange={set('duree')} />
            </Field>
          </div>
          <Field label="Lieu" error={champs.lieu}>
            <Input value={form.lieu} onChange={set('lieu')} placeholder="Bibliothèque, salle 2 ou « En ligne »" required />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="session-form" disabled={create.isPending}>
            Planifier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function useGroupAction(id, mutationFn, success) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      toast.success(success);
      queryClient.invalidateQueries({ queryKey: ['groupe', id] });
      queryClient.invalidateQueries({ queryKey: ['groupes'] });
    },
    onError: (e) => toast.error(e.message),
  });
}

function Confirm({ state, onClose }) {
  return (
    <AlertDialog open={Boolean(state)} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state?.title}</AlertDialogTitle>
          <AlertDialogDescription>{state?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Retour</AlertDialogCancel>
          <AlertDialogAction onClick={state?.onConfirm} className="bg-destructive text-white hover:bg-destructive/90">
            {state?.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function GroupeDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const join = useJoinGroup();
  const fileRef = useRef(null);
  const [planning, setPlanning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const { data: group, isPending, error } = useQuery({ queryKey: ['groupe', id], queryFn: () => get(`/groupes/${id}`).then((r) => r.groupe) });
  const leave = useGroupAction(id, () => del(`/groupes/${id}/membres/${user._id}`), 'Vous avez quitté le groupe.');
  const removeMember = useGroupAction(id, (uid) => del(`/groupes/${id}/membres/${uid}`), 'Membre retiré.');
  const removeSession = useGroupAction(id, (sid) => del(`/groupes/${id}/seances/${sid}`), 'Séance supprimée.');
  const removeDoc = useGroupAction(id, (did) => del(`/groupes/${id}/documents/${did}`), 'Document supprimé.');
  const upload = useGroupAction(id, (file) => {
    const data = new FormData();
    data.append('fichier', file);
    return api.post(`/groupes/${id}/documents`, data);
  }, 'Document partagé.');
  const removeGroup = useMutation({
    mutationFn: () => del(`/groupes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupes'] });
      toast.success('Groupe supprimé.');
      navigate('/groupes', { replace: true });
    },
    onError: (e) => toast.error(e.message),
  });

  const back = (
    <Link to="/groupes" className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" /> Groupes
    </Link>
  );
  if (isPending)
    return (
      <>
        {back}
        <div className="h-36 rounded-lg bg-muted animate-pulse" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="h-64 rounded-lg bg-muted/70 animate-pulse" />
          <div className="h-64 rounded-lg bg-muted/70 animate-pulse" />
        </div>
      </>
    );
  if (error) return <>{back}<EmptyState icon={TriangleAlert} title="Groupe introuvable" description="Il a peut-être été supprimé par son créateur." /></>;

  const creator = group.membres.find((m) => m.role === 'CREATEUR')?.utilisateur;
  const full = group.nbMembres >= group.capaciteMax;

  return (
    <>
      {back}
      <header className="flex flex-col gap-5 rounded-lg border bg-card p-5 shadow-xs sm:p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex max-w-2xl flex-col gap-2">
          <span className="self-start rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-soft-foreground">{group.matiere}</span>
          <h1 className="text-2xl font-semibold">{group.nom}</h1>
          <p className="text-sm text-muted-foreground">Animé par {group.estCreateur ? 'vous' : fullName(creator)}</p>
          {group.description && <p className="mt-1 leading-relaxed text-foreground-2">{group.description}</p>}
        </div>
        <div className="flex w-full flex-col gap-3 lg:w-64">
          <CapacityBar value={group.nbMembres} max={group.capaciteMax} />
          {group.estCreateur ? (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditing(true)}>
                <Pencil /> Modifier
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive-soft hover:text-destructive"
                aria-label="Supprimer le groupe"
                onClick={() => setConfirm({ title: 'Supprimer ce groupe ?', description: 'Les séances et documents partagés seront supprimés pour tous les membres.', confirm: 'Supprimer', onConfirm: () => removeGroup.mutate() })}
              >
                <Trash2 />
              </Button>
            </div>
          ) : group.estMembre ? (
            <Button variant="outline" onClick={() => setConfirm({ title: 'Quitter ce groupe ?', description: 'Vous n’aurez plus accès aux documents partagés.', confirm: 'Quitter', onConfirm: () => leave.mutate() })}>
              Quitter le groupe
            </Button>
          ) : (
            <Button disabled={full || join.isPending} onClick={() => join.mutate(id)}>
              {full ? 'Groupe complet' : 'Rejoindre le groupe'}
            </Button>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3" aria-labelledby="seances">
            <div className="flex items-center justify-between gap-3">
              <h2 id="seances" className="font-semibold">
                Prochaines séances
              </h2>
              {group.estMembre && (
                <Button size="sm" variant="ghost" className="text-primary" onClick={() => setPlanning(true)}>
                  <CalendarPlus /> Planifier une séance
                </Button>
              )}
            </div>
            {group.seances.length === 0 ? (
              <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">Aucune séance prévue.{group.estMembre && ' Proposez-en une aux membres.'}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {group.seances.map((s) => (
                  <li key={s._id} className="flex items-center gap-4 rounded-lg border bg-card p-3.5 shadow-xs">
                    <div className="flex w-12 shrink-0 flex-col items-center rounded-md border py-1">
                      <span className="text-[11px] font-semibold text-primary uppercase">{monthShort(s.date)}</span>
                      <span className="text-lg leading-tight font-bold">{dayNum(s.date)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{s.sujet}</p>
                      <p className="flex flex-wrap items-center gap-x-3 text-[13px] text-muted-foreground">
                        <span className="first-letter:uppercase">
                          {dayShort(s.date)}, {time(s.date)} à {time(addMinutes(s.date, s.duree))}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5" /> {s.lieu}
                        </span>
                      </p>
                    </div>
                    {(group.estCreateur || String(s.creePar) === String(user._id)) && (
                      <Button variant="ghost" size="icon-sm" aria-label={`Supprimer la séance ${s.sujet}`} onClick={() => removeSession.mutate(s._id)}>
                        <X />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="documents">
            <div className="flex items-center justify-between gap-3">
              <h2 id="documents" className="font-semibold">
                Documents partagés
              </h2>
              {group.estMembre && (
                <>
                  <Button size="sm" variant="ghost" className="text-primary" disabled={upload.isPending} onClick={() => fileRef.current?.click()}>
                    <Upload /> {upload.isPending ? 'Envoi…' : 'Ajouter un PDF'}
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/pdf"
                    className="sr-only"
                    tabIndex={-1}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      if (file.type !== 'application/pdf') return toast.error('Seuls les fichiers PDF sont acceptés.');
                      if (file.size > MAX_PDF) return toast.error('PDF trop lourd (20 Mo maximum).');
                      upload.mutate(file);
                    }}
                  />
                </>
              )}
            </div>
            {!group.estMembre ? (
              <p className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                <Lock className="size-4" /> {group.nbDocuments ? `${group.nbDocuments} document${group.nbDocuments > 1 ? 's' : ''} réservé${group.nbDocuments > 1 ? 's' : ''} aux membres.` : 'Les documents sont réservés aux membres.'}
              </p>
            ) : group.documents.length === 0 ? (
              <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">Aucun document. Partagez vos résumés et TD corrigés en PDF.</p>
            ) : (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2">
                {group.documents.map((d) => (
                  <li key={d._id} className="group flex items-center gap-3 rounded-lg border bg-card p-3 shadow-xs transition-colors hover:border-input">
                    <FileText className="size-6 shrink-0 text-destructive" strokeWidth={1.5} />
                    <a href={`/api/groupes/${id}/documents/${d._id}`} download className="min-w-0 flex-1 rounded-sm focus-visible:outline-2 focus-visible:outline-ring">
                      <span className="block truncate text-sm font-semibold group-hover:underline">{d.nomFichier}</span>
                      <span className="text-xs text-muted-foreground">
                        {shortName(d.deposePar)} · {fileSize(d.taille)} · {relative(d.dateDepot)}
                      </span>
                    </a>
                    <Download className="size-4 text-muted-foreground" aria-hidden="true" />
                    {(group.estCreateur || String(d.deposePar?._id) === String(user._id)) && (
                      <Button variant="ghost" size="icon-xs" aria-label={`Supprimer ${d.nomFichier}`} onClick={() => removeDoc.mutate(d._id)}>
                        <X />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-xs" aria-labelledby="membres">
          <h2 id="membres" className="font-semibold">
            Membres <span className="font-normal text-muted-foreground">({group.nbMembres})</span>
          </h2>
          <ul className="flex flex-col gap-1">
            {group.membres.map((m) => (
              <li key={m.utilisateur._id} className="flex items-center gap-2.5 rounded-md p-1.5">
                <UserAvatar user={m.utilisateur} className="size-8" tone={m.role === 'CREATEUR' ? 'accent' : 'muted'} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{String(m.utilisateur._id) === String(user._id) ? 'Vous' : fullName(m.utilisateur)}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.role === 'CREATEUR' ? 'Animateur' : m.utilisateur.filiere || 'Membre'}</p>
                </div>
                {group.estCreateur && m.role !== 'CREATEUR' && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Retirer ${fullName(m.utilisateur)}`}
                    onClick={() => setConfirm({ title: `Retirer ${fullName(m.utilisateur)} ?`, description: 'Ce membre pourra rejoindre à nouveau le groupe.', confirm: 'Retirer', onConfirm: () => removeMember.mutate(m.utilisateur._id) })}
                  >
                    <X />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <SessionDialog open={planning} onOpenChange={setPlanning} groupId={id} />
      <GroupFormSheet open={editing} onOpenChange={setEditing} group={group} />
      <Confirm state={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}
