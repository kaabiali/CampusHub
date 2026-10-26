import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Field } from '@/components/Field';
import { FormError } from '@/components/FormError';
import { get, patch, post } from '@/lib/api';
import { addMinutes, fromTunisInput, toTunisInput } from '@/lib/format';

const NO_CLUBS = [];

const blank = () => ({ club: '', titre: '', description: '', lieu: '', dateDebut: toTunisInput(addMinutes(new Date(), 7 * 24 * 60)).slice(0, 11) + '14:00', dateFin: '', capacite: '', estPublic: true });

const fromEvent = (e) => ({
  club: e.club._id,
  titre: e.titre,
  description: e.description || '',
  lieu: e.lieu,
  dateDebut: toTunisInput(e.dateDebut),
  dateFin: e.dateFin ? toTunisInput(e.dateFin) : '',
  capacite: e.capacite ? String(e.capacite) : '',
  estPublic: e.estPublic,
});

export function useMyClubs() {
  return useQuery({ queryKey: ['clubs', 'mes-clubs'], queryFn: () => get('/clubs/mes-clubs').then((r) => r.clubs), staleTime: 5 * 60_000 });
}

export function EventFormSheet({ open, onOpenChange, event }) {
  const [form, setForm] = useState(blank);
  const { data: clubs = NO_CLUBS } = useMyClubs();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (open) setForm(event ? fromEvent(event) : blank());
  }, [open, event]);

  // A leader of a single club shouldn't have to pick it.
  const club = form.club || (clubs.length === 1 ? clubs[0]._id : '');

  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...form,
        club,
        dateDebut: fromTunisInput(form.dateDebut),
        dateFin: form.dateFin ? fromTunisInput(form.dateFin) : null,
        capacite: form.capacite ? Number(form.capacite) : null,
      };
      if (event) delete body.club;
      return (event ? patch(`/evenements/${event._id}`, body) : post('/evenements', body)).then((r) => r.evenement);
    },
    onSuccess: (e) => {
      queryClient.invalidateQueries({ queryKey: ['evenements'] });
      queryClient.invalidateQueries({ queryKey: ['evenement', e._id] });
      toast.success(event ? 'Événement mis à jour.' : 'Événement publié.');
      onOpenChange(false);
      if (!event) navigate(`/evenements/${e._id}`);
    },
  });
  const champs = save.error?.champs || {};
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle>{event ? 'Modifier l’événement' : 'Publier un événement'}</SheetTitle>
          <SheetDescription>Les inscrits reçoivent un rappel la veille.</SheetDescription>
        </SheetHeader>
        <form
          id="event-form"
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <FormError error={save.error} />
          {!event && (
            <Field label="Club" error={champs.club}>
              {(p) => (
                <Select value={club} onValueChange={set('club')}>
                  <SelectTrigger className="w-full" {...p}>
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    {clubs.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
          )}
          <Field label="Titre" error={champs.titre}>
            <Input value={form.titre} onChange={set('titre')} placeholder="Ex. Atelier CV et LinkedIn" required />
          </Field>
          <Field label="Lieu" error={champs.lieu}>
            <Input value={form.lieu} onChange={set('lieu')} placeholder="Ex. Amphi B" required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Début" error={champs.dateDebut}>
              <Input type="datetime-local" value={form.dateDebut} onChange={set('dateDebut')} required />
            </Field>
            <Field label="Fin" optional error={champs.dateFin}>
              <Input type="datetime-local" value={form.dateFin} onChange={set('dateFin')} />
            </Field>
          </div>
          <Field label="Capacité" optional error={champs.capacite} help="Laissez vide pour une entrée libre.">
            <Input type="number" min={1} max={5000} value={form.capacite} onChange={set('capacite')} className="w-32" />
          </Field>
          <Field label="Description" optional error={champs.description}>
            <Textarea rows={5} value={form.description} onChange={set('description')} maxLength={2000} />
          </Field>
          <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
            <Checkbox checked={form.estPublic} onCheckedChange={(v) => set('estPublic')(Boolean(v))} className="mt-0.5" />
            <span>
              <span className="font-medium">Visible sur la page d’accueil publique</span>
              <span className="block text-muted-foreground">Les visiteurs non connectés verront l’événement.</span>
            </span>
          </label>
        </form>
        <SheetFooter className="flex-row justify-end border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="event-form" disabled={save.isPending}>
            {save.isPending ? 'Enregistrement…' : event ? 'Enregistrer' : 'Publier'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
