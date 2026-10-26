import { useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Field } from '@/components/Field';
import { FormError } from '@/components/FormError';
import { patch, post } from '@/lib/api';
import { MATIERES } from '@/lib/constants';

const blank = { nom: '', matiere: '', description: '', capaciteMax: '12' };

export function GroupFormSheet({ open, onOpenChange, group }) {
  const [form, setForm] = useState(blank);
  const listId = useId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) setForm(group ? { nom: group.nom, matiere: group.matiere, description: group.description, capaciteMax: String(group.capaciteMax) } : blank);
  }, [open, group]);

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, capaciteMax: Number(form.capaciteMax) };
      return (group ? patch(`/groupes/${group._id}`, body) : post('/groupes', body)).then((r) => r.groupe);
    },
    onSuccess: (g) => {
      queryClient.invalidateQueries({ queryKey: ['groupes'] });
      queryClient.invalidateQueries({ queryKey: ['groupe', g._id] });
      toast.success(group ? 'Groupe mis à jour.' : 'Groupe créé.');
      onOpenChange(false);
      if (!group) navigate(`/groupes/${g._id}`);
    },
  });
  const champs = save.error?.champs || {};
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{group ? 'Modifier le groupe' : 'Créer un groupe'}</SheetTitle>
          <SheetDescription>{group ? 'Les membres voient les changements immédiatement.' : 'Vous en serez l’animateur et le premier membre.'}</SheetDescription>
        </SheetHeader>
        <form
          id="group-form"
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <FormError error={save.error} />
          <Field label="Nom du groupe" error={champs.nom}>
            <Input value={form.nom} onChange={set('nom')} placeholder="Ex. Probabilités, révision du partiel" required />
          </Field>
          <Field label="Matière" error={champs.matiere}>
            <Input value={form.matiere} onChange={set('matiere')} list={listId} required />
          </Field>
          <datalist id={listId}>
            {MATIERES.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <Field label="Description" optional error={champs.description} help="Objectif, rythme des séances, niveau attendu.">
            <Textarea rows={4} value={form.description} onChange={set('description')} maxLength={600} />
          </Field>
          <Field label="Nombre maximum de membres" error={champs.capaciteMax}>
            <Input type="number" min={2} max={50} value={form.capaciteMax} onChange={set('capaciteMax')} className="w-28" />
          </Field>
        </form>
        <SheetFooter className="flex-row justify-end border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="group-form" disabled={save.isPending}>
            {save.isPending ? 'Enregistrement…' : group ? 'Enregistrer' : 'Créer le groupe'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
