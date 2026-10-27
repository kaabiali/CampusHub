import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Lock, PhoneOff, Video } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/Field';
import { FormError } from '@/components/FormError';
import { Input } from '@/components/ui/input';
import { del, post } from '@/lib/api';
import { fullName, relative } from '@/lib/format';
import { useAuth } from '@/providers/AuthProvider';

function MeetingDialog({ open, onOpenChange, groupId }) {
  const queryClient = useQueryClient();
  const [sujet, setSujet] = useState('');
  const create = useMutation({
    mutationFn: () => post(`/groupes/${groupId}/reunion`, { sujet }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['groupe', groupId] });
      toast.success('Réunion ouverte.', {
        description: 'Les membres peuvent la rejoindre depuis la page du groupe.',
        action: { label: 'Rejoindre', onClick: () => window.open(data.reunion.url, '_blank', 'noopener,noreferrer') },
      });
      setSujet('');
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ouvrir une réunion</DialogTitle>
          <DialogDescription>Une salle de visioconférence réservée aux membres du groupe sera créée.</DialogDescription>
        </DialogHeader>
        <form
          id="meeting-form"
          className="flex flex-col gap-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <FormError error={create.error} />
          <Field label="Sujet (facultatif)" error={create.error?.champs?.sujet}>
            <Input value={sujet} onChange={(e) => setSujet(e.target.value)} placeholder="Ex. Révision du partiel, lois continues" maxLength={120} autoFocus />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="meeting-form" disabled={create.isPending}>
            <Video /> {create.isPending ? 'Ouverture…' : 'Ouvrir la réunion'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GroupMeeting({ groupId, reunion, estMembre, estCreateur }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const end = useMutation({
    mutationFn: () => del(`/groupes/${groupId}/reunion`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupe', groupId] });
      toast.success('Réunion terminée.');
    },
    onError: (e) => toast.error(e.message),
  });

  if (!estMembre) {
    return (
      <section className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-xs" aria-labelledby="reunion">
        <h2 id="reunion" className="font-semibold">
          Réunion
        </h2>
        <p className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-5 text-sm text-muted-foreground">
          <Lock className="size-4" /> Les réunions sont réservées aux membres du groupe.
        </p>
      </section>
    );
  }

  const animateur = reunion?.demarrePar?.prenom ? fullName(reunion.demarrePar) : 'un membre';
  const canEnd = reunion && (estCreateur || String(reunion.demarrePar?._id ?? reunion.demarrePar) === String(user._id));

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(reunion.url);
      toast.success('Lien de la réunion copié.');
    } catch {
      toast.error('Impossible de copier le lien.');
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-xs" aria-labelledby="reunion">
      <h2 id="reunion" className="font-semibold">
        Réunion
      </h2>
      {reunion ? (
        <>
          <div className="flex items-start gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-success-soft text-success">
              <Video className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm leading-snug font-medium">{reunion.sujet}</p>
              <p className="text-xs text-muted-foreground">
                Ouverte par {animateur} · {relative(reunion.demarreeLe).toLowerCase()}
              </p>
            </div>
          </div>
          <Button asChild className="w-full">
            <a href={reunion.url} target="_blank" rel="noopener noreferrer">
              <Video /> Rejoindre la réunion
            </a>
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={copyLink}
            >
              <Copy /> Copier le lien
            </Button>
            {canEnd && (
              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive-soft hover:text-destructive" aria-label="Terminer la réunion" onClick={() => end.mutate()} disabled={end.isPending}>
                <PhoneOff />
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Lancez une visioconférence pour réviser à plusieurs, sans quitter CampusHub.</p>
          <Button className="w-full" onClick={() => setOpen(true)}>
            <Video /> Ouvrir une réunion
          </Button>
        </>
      )}
      <MeetingDialog open={open} onOpenChange={setOpen} groupId={groupId} />
    </section>
  );
}
