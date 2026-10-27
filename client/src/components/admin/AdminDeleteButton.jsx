import { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/Field';
import { Textarea } from '@/components/ui/textarea';
import { del } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

const EFFECTS = {
  LIVRE: 'L’annonce et ses photos seront définitivement supprimées. Le vendeur sera prévenu.',
  TRAJET: 'Le trajet et ses réservations seront définitivement supprimés. Le conducteur et les passagers seront prévenus.',
  EVENEMENT: 'L’événement et ses inscriptions seront définitivement supprimés. L’organisateur et les inscrits seront prévenus.',
  GROUPE: 'Le groupe, ses documents et ses messages seront définitivement supprimés. Le créateur et les membres seront prévenus.',
};

// Shown only to administrators, so the moderation action never clutters a student's view.
export function AdminDeleteButton({ type, id, titre, invalidate = [], onDeleted, label = 'Supprimer', variant = 'ghost', size = 'sm', className, iconOnly = false }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [motif, setMotif] = useState('');
  const queryClient = useQueryClient();
  const formId = useId();

  const remove = useMutation({
    mutationFn: () => del(`/admin/contenus/${type}/${id}`, { motif: motif.trim() }),
    onSuccess: () => {
      for (const queryKey of invalidate) queryClient.invalidateQueries({ queryKey });
      toast.success('Contenu supprimé. L’auteur a été prévenu avec le motif.');
      setOpen(false);
      setMotif('');
      onDeleted?.();
    },
    onError: (e) => toast.error(e.message),
  });

  if (user?.role !== 'ADMIN') return null;

  const tooShort = motif.trim().length < 5;

  return (
    <>
      <Button variant={variant} size={size} className={className} aria-label={iconOnly ? label : undefined} onClick={() => setOpen(true)}>
        <Trash2 />
        {!iconOnly && label}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setMotif('');
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-destructive" /> Supprimer ce contenu ?
            </DialogTitle>
            <DialogDescription>
              « {titre} »<br />
              {EFFECTS[type]}
            </DialogDescription>
          </DialogHeader>
          <form
            id={formId}
            className="flex flex-col gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (!tooShort) remove.mutate();
            }}
          >
            <Field label="Motif de la suppression" help="Le motif est envoyé en notification à l’auteur.">
              <Textarea
                rows={3}
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                maxLength={200}
                required
                autoFocus
                placeholder="Ex. annonce trompeuse, propos inappropriés, contenu hors charte…"
              />
            </Field>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" form={formId} variant="destructive" disabled={tooShort || remove.isPending}>
              {remove.isPending ? 'Suppression…' : 'Supprimer définitivement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
