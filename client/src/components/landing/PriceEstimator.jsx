import { useState } from 'react';
import { useDebounced } from '@/hooks/useDebounced';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/Field';
import { get } from '@/lib/api';
import { price } from '@/lib/format';

export const ETATS = [
  { value: 'NEUF', label: 'Neuf' },
  { value: 'TRES_BON', label: 'Très bon' },
  { value: 'BON', label: 'Bon' },
  { value: 'ACCEPTABLE', label: 'Acceptable' },
];

export function usePriceSuggestion({ matiere, etat, anneeEdition, prixNeuf }) {
  const params = useDebounced({ matiere, etat, anneeEdition, prixNeuf }, 400);
  const valid = params.matiere?.trim() && params.etat && Number(params.anneeEdition) >= 1980 && Number(params.prixNeuf) > 0;
  return useQuery({
    queryKey: ['prix-conseille', params],
    queryFn: () => get('/annonces/prix-conseille', params),
    enabled: Boolean(valid),
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });
}

export function SuggestionResult({ query, compact }) {
  if (query.isError) return <span className="text-sm text-muted-foreground">Estimation indisponible pour le moment.</span>;
  if (!query.data) return <span className={`block rounded-md bg-muted animate-pulse ${compact ? 'h-6 w-28' : 'h-8 w-36'}`} />;
  const { min, max, source } = query.data;
  return (
    <span className="flex flex-col items-end gap-0.5">
      <span className={`font-mono tabular text-primary ${compact ? 'text-lg' : 'text-[28px] leading-none'}`}>
        {min === max ? price(min) : `${min} à ${price(max)}`}
      </span>
      {source === 'fallback' && <span className="text-xs text-muted-foreground">Estimation simplifiée</span>}
    </span>
  );
}

export function PriceEstimator() {
  const [form, setForm] = useState({ matiere: 'Probabilités', etat: 'TRES_BON', anneeEdition: '2021', prixNeuf: '45' });
  const query = usePriceSuggestion(form);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }));

  return (
    <form className="flex flex-col gap-5 rounded-xl border bg-background p-6 shadow-md sm:p-7" onSubmit={(e) => e.preventDefault()} aria-label="Estimer le prix d’un livre">
      <div className="flex items-center gap-2 font-semibold">
        <Sparkles className="size-[18px] text-primary" strokeWidth={1.75} /> Estimer le prix d’un livre
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Matière">
          <Input value={form.matiere} onChange={set('matiere')} />
        </Field>
        <Field label="État">
          {(p) => (
            <Select value={form.etat} onValueChange={set('etat')}>
              <SelectTrigger className="w-full" {...p}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ETATS.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
        <Field label="Année d’édition">
          <Input inputMode="numeric" value={form.anneeEdition} onChange={set('anneeEdition')} />
        </Field>
        <Field label="Prix neuf (DT)">
          <Input inputMode="decimal" value={form.prixNeuf} onChange={set('prixNeuf')} />
        </Field>
      </div>
      <div className="flex items-center justify-between gap-4 border-t pt-4" aria-live="polite">
        <span className="text-sm text-foreground-2">Prix conseillé</span>
        <SuggestionResult query={query} />
      </div>
    </form>
  );
}
