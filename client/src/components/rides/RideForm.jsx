import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/Field';
import { FormError } from '@/components/FormError';
import { RideMapPicker } from '@/components/map/RideMap';
import { get, patch, post } from '@/lib/api';
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

// Identifies the current origin/destination so a stale estimate is never displayed
// after the user changes one of them.
const signatureOf = (form) =>
  form.coordDepart && form.coordArrivee
    ? `c:${form.coordDepart.lat},${form.coordDepart.lng};${form.coordArrivee.lat},${form.coordArrivee.lng}`
    : `l:${form.lieuDepart.trim()}|${form.lieuArrivee.trim()}`;

export function RideForm({ ride, onDone, firstFieldRef, compact }) {
  const [form, setForm] = useState(() => (ride ? fromRide(ride) : blank()));
  // A duration typed (or already saved) by the user is never overwritten automatically.
  const [dureeManuelle, setDureeManuelle] = useState(Boolean(ride?.dureeMinutes));
  const [estimation, setEstimation] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [recalc, setRecalc] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (ride) {
      setForm(fromRide(ride));
      setDureeManuelle(Boolean(ride.dureeMinutes));
    }
  }, [ride]);

  // Ask the API for the road duration as soon as both ends are known (pins first,
  // then addresses), and fill the field unless the user chose their own value.
  useEffect(() => {
    if (dureeManuelle) {
      setEstimating(false);
      return undefined;
    }

    const { coordDepart, coordArrivee } = form;
    const withCoords = Boolean(coordDepart && coordArrivee);
    const withLabels = form.lieuDepart.trim().length >= 3 && form.lieuArrivee.trim().length >= 3;
    if (!withCoords && !withLabels) {
      setEstimation(null);
      setEstimating(false);
      return undefined;
    }

    const sig = signatureOf(form);
    let cancelled = false;
    const timer = setTimeout(async () => {
      setEstimating(true);
      try {
        const params = withCoords
          ? { departLat: coordDepart.lat, departLng: coordDepart.lng, arriveeLat: coordArrivee.lat, arriveeLng: coordArrivee.lng }
          : { depart: form.lieuDepart.trim(), arrivee: form.lieuArrivee.trim() };
        const data = await get('/geo/itineraire', params);
        if (cancelled) return;
        setEstimation({ ...data, sig });
        setForm((f) => ({ ...f, dureeMinutes: String(data.dureeMinutes) }));
      } catch {
        if (!cancelled) setEstimation(null);
      } finally {
        if (!cancelled) setEstimating(false);
      }
    }, withCoords ? 300 : 900);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `form` is read above; only the fields that change the route are dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.coordDepart, form.coordArrivee, form.lieuDepart, form.lieuArrivee, dureeManuelle, recalc]);

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
      if (!ride) {
        setForm(blank());
        setDureeManuelle(false);
        setEstimation(null);
      }
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

  // Only show an estimate that still matches the current origin/destination.
  const current = estimation && estimation.sig === signatureOf(form) ? estimation : null;
  const km = current?.distanceKm;
  const aideDuree = estimating
    ? 'Estimation de la durée…'
    : current
      ? [
          `${dureeManuelle ? '' : '≈ '}${current.dureeMinutes} min`,
          km !== undefined ? `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(km)} km` : null,
          current.source === 'route' ? 'itinéraire routier' : 'estimation',
          dureeManuelle ? 'durée personnalisée' : 'modifiable',
        ]
          .filter(Boolean)
          .join(' · ')
      : 'Remplie automatiquement dès que le départ et l’arrivée sont connus.';

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
        <Field
          label="Durée (min)"
          optional
          error={champs.dureeMinutes}
          help={
            <span>
              {aideDuree}
              {dureeManuelle && (
                <>
                  {' · '}
                  <button
                    type="button"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                    onClick={() => {
                      setDureeManuelle(false);
                      setRecalc((n) => n + 1);
                    }}
                  >
                    Recalculer
                  </button>
                </>
              )}
            </span>
          }
        >
          <Input
            inputMode="numeric"
            value={form.dureeMinutes}
            onChange={(e) => {
              setDureeManuelle(true);
              set('dureeMinutes')(e);
            }}
            placeholder="35"
          />
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
