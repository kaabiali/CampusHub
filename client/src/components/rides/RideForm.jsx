import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/Field';
import { FormError } from '@/components/FormError';
import { RideMapPicker } from '@/components/map/RideMap';
import { patch, post } from '@/lib/api';
import { addMinutes, fromTunisInput, toTunisInput } from '@/lib/format';

const blank = () => ({
  lieuDepart: '',
  lieuArrivee: 'Campus',
  coordDepart: null,
  coordArrivee: null,
  dateDepart: toTunisInput(addMinutes(new Date(), 24 * 60)).slice(0, 11) + '08:00',
  placesTotales: '3',
  prix: '3',
  dureeMinutes: '',
  vehicule: '',
  details: '',
});

const fromRide = (r) => ({
  lieuDepart: r.lieuDepart,
  lieuArrivee: r.lieuArrivee,
  coordDepart: r.coordDepart || null,
  coordArrivee: r.coordArrivee || null,
  dateDepart: toTunisInput(r.dateDepart),
  placesTotales: String(r.placesTotales),
  prix: String(r.prix),
  dureeMinutes: r.dureeMinutes ? String(r.dureeMinutes) : '',
  vehicule: r.vehicule || '',
  details: r.details || '',
});

export function RideForm({ ride, onDone, firstFieldRef, compact }) {
  const [form, setForm] = useState(() => (ride ? fromRide(ride) : blank()));
  const queryClient = useQueryClient();
  useEffect(() => {
    if (ride) setForm(fromRide(ride));
  }, [ride]);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...form,
        dateDepart: fromTunisInput(form.dateDepart),
        placesTotales: Number(form.placesTotales),
        prix: Number(form.prix),
        dureeMinutes: form.dureeMinutes ? Number(form.dureeMinutes) : null,
      };
      return (ride ? patch(`/trajets/${ride._id}`, body) : post('/trajets', body)).then((r) => r.trajet);
    },
    onSuccess: (trajet) => {
      queryClient.invalidateQueries({ queryKey: ['trajets'] });
      queryClient.invalidateQueries({ queryKey: ['mes-trajets'] });
      queryClient.invalidateQueries({ queryKey: ['trajet', trajet._id] });
      toast.success(ride ? 'Trajet mis à jour.' : 'Trajet publié.');
      if (!ride) setForm(blank());
      onDone?.(trajet);
    },
  });
  const champs = save.error?.champs || {};
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  // Typing a place by hand detaches it from the pin: otherwise the map would show a
  // route to an old coordinate that no longer matches the label the user just wrote.
  const setLieu = (k, coordKey) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [k]: value, [coordKey]: null }));
  };
  const setPoint = (part, point) => {
    const coordKey = part === 'depart' ? 'coordDepart' : 'coordArrivee';
    const labelKey = part === 'depart' ? 'lieuDepart' : 'lieuArrivee';
    setForm((f) => ({
      ...f,
      [coordKey]: point ? { lat: point.lat, lng: point.lng } : null,
      // Reverse geocoding fills a short label; only replace the text when it is provided.
      ...(point?.label ? { [labelKey]: point.label.slice(0, 80) } : {}),
    }));
  };

  return (
    <form
      className="flex flex-col gap-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <FormError error={save.error} />
      <Field label="Départ" error={champs.lieuDepart}>
        <Input ref={firstFieldRef} value={form.lieuDepart} onChange={setLieu('lieuDepart', 'coordDepart')} placeholder="Ex. Ariana, Menzah 6" required />
      </Field>
      <Field label="Arrivée" error={champs.lieuArrivee}>
        <Input value={form.lieuArrivee} onChange={setLieu('lieuArrivee', 'coordArrivee')} required />
      </Field>
      <Field
        label="Itinéraire sur la carte"
        optional
        error={champs.coordDepart || champs.coordArrivee}
      >
        <RideMapPicker
          depart={form.coordDepart}
          arrivee={form.coordArrivee}
          departLabel={form.lieuDepart}
          arriveeLabel={form.lieuArrivee}
          onChange={setPoint}
          height={compact ? 220 : 260}
        />
      </Field>
      <div className={compact ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-2 gap-3'}>
        <Field label="Date et heure" error={champs.dateDepart}>
          <Input type="datetime-local" value={form.dateDepart} onChange={set('dateDepart')} required />
        </Field>
        <Field label="Durée (min)" optional error={champs.dureeMinutes}>
          <Input inputMode="numeric" value={form.dureeMinutes} onChange={set('dureeMinutes')} placeholder="35" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Places" error={champs.placesTotales}>
          <Input type="number" min={1} max={6} value={form.placesTotales} onChange={set('placesTotales')} required />
        </Field>
        <Field label="Prix par place (DT)" error={champs.prix}>
          <Input inputMode="decimal" value={form.prix} onChange={set('prix')} required className="font-mono" />
        </Field>
      </div>
      <Field label="Véhicule" optional error={champs.vehicule}>
        <Input value={form.vehicule} onChange={set('vehicule')} placeholder="Ex. Clio grise" />
      </Field>
      <Field label="Point de rendez-vous" optional error={champs.details}>
        <Textarea rows={2} value={form.details} onChange={set('details')} maxLength={300} placeholder="Ex. devant la pharmacie, 5 min avant" />
      </Field>
      <Button type="submit" disabled={save.isPending} className="mt-1">
        {save.isPending ? 'Enregistrement…' : ride ? 'Enregistrer' : 'Publier le trajet'}
      </Button>
    </form>
  );
}
