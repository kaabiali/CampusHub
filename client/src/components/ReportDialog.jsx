import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/Field';
import { FormError } from '@/components/FormError';
import { post } from '@/lib/api';

const REASONS = ['Prix abusif', 'Contenu trompeur', 'Arnaque suspectée', 'Contenu inapproprié'];

export function ReportDialog({ open, onOpenChange, typeContenu, contenuId }) {
  const [motif, setMotif] = useState('');
  const report = useMutation({
    mutationFn: () => post('/signalements', { typeContenu, contenuId, motif }),
    onSuccess: () => {
      toast.success('Signalement envoyé. Un administrateur va l’examiner.');
      setMotif('');
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Signaler ce contenu</DialogTitle>
          <DialogDescription>Le signalement est anonyme pour l’auteur du contenu.</DialogDescription>
        </DialogHeader>
        <form
          id="report-form"
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            report.mutate();
          }}
        >
          <FormError error={report.error} />
          <div className="flex flex-wrap gap-1.5">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setMotif(r)}
                className={`rounded-md border px-2.5 py-1 text-[13px] transition-colors ${motif === r ? 'border-primary bg-primary-soft text-primary-soft-foreground' : 'border-input hover:bg-accent'}`}
              >
                {r}
              </button>
            ))}
          </div>
          <Field label="Motif" error={report.error?.champs?.motif}>
            <Textarea rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={300} placeholder="Décrivez le problème" required />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="report-form" variant="destructive" disabled={report.isPending || motif.trim().length < 5}>
            {report.isPending ? 'Envoi…' : 'Signaler'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
