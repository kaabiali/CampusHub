import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Field } from '@/components/Field';
import { FormError } from '@/components/FormError';
import { SuggestionResult, usePriceSuggestion } from '@/components/landing/PriceEstimator';
import { api, get } from '@/lib/api';
import { ETAT_LABELS, ETATS } from '@/lib/books';
import { MATIERES } from '@/lib/constants';

const MAX_PHOTOS = 5;
const MAX_BYTES = 5 * 1024 * 1024;

const emptyForm = { titre: '', auteur: '', categorie: '', matiere: '', etat: 'BON', anneeEdition: '', prixNeuf: '', prix: '', description: '' };

function fromBook(book) {
  return {
    titre: book.titre,
    auteur: book.auteur || '',
    categorie: book.categorie?._id || '',
    matiere: book.matiere,
    etat: book.etat,
    anneeEdition: book.anneeEdition ? String(book.anneeEdition) : '',
    prixNeuf: book.prixNeuf ? String(book.prixNeuf) : '',
    prix: String(book.prix),
    description: book.description || '',
  };
}

function PhotoPicker({ photos, onChange }) {
  const inputRef = useRef(null);
  const addFiles = (files) => {
    const accepted = [];
    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) toast.error(`« ${file.name} » n’est pas une image JPG, PNG ou WebP.`);
      else if (file.size > MAX_BYTES) toast.error(`« ${file.name} » dépasse 5 Mo.`);
      else accepted.push({ kind: 'new', file, url: URL.createObjectURL(file) });
    }
    const room = MAX_PHOTOS - photos.length;
    if (accepted.length > room) toast.error(`${MAX_PHOTOS} photos maximum.`);
    onChange([...photos, ...accepted.slice(0, room)]);
  };
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {photos.map((p, i) => (
        <div key={p.url} className="group relative aspect-square overflow-hidden rounded-md border bg-muted">
          <img src={p.url} alt={`Photo ${i + 1}`} className="size-full object-cover" />
          {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[11px] font-medium text-white">Couverture</span>}
          <button
            type="button"
            onClick={() => onChange(photos.filter((x) => x !== p))}
            className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-md bg-black/60 text-white opacity-90 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-white"
            aria-label={`Retirer la photo ${i + 1}`}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      {photos.length < MAX_PHOTOS && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed border-input text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ImagePlus className="size-5" strokeWidth={1.75} />
          Ajouter
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          addFiles([...e.target.files]);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export function BookFormSheet({ open, onOpenChange, book }) {
  const editing = Boolean(book);
  const [form, setForm] = useState(emptyForm);
  const [photos, setPhotos] = useState([]);
  const listId = useId();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => get('/categories').then((r) => r.categories), staleTime: Infinity });

  useEffect(() => {
    if (!open) return;
    setForm(book ? fromBook(book) : emptyForm);
    setPhotos(book ? book.photos.map((p) => ({ kind: 'existing', url: p.url })) : []);
  }, [open, book]);

  const suggestion = usePriceSuggestion(form);

  const save = useMutation({
    mutationFn: () => {
      const data = new FormData();
      for (const [k, v] of Object.entries(form)) data.append(k, v);
      photos.filter((p) => p.kind === 'new').forEach((p) => data.append('photos', p.file));
      if (editing) data.append('conserver', JSON.stringify(photos.filter((p) => p.kind === 'existing').map((p) => p.url)));
      return (editing ? api.patch(`/annonces/${book._id}`, data) : api.post('/annonces', data)).then((r) => r.data.annonce);
    },
    onSuccess: (annonce) => {
      queryClient.invalidateQueries({ queryKey: ['annonces'] });
      queryClient.setQueryData(['annonce', annonce._id], annonce);
      toast.success(editing ? 'Annonce mise à jour.' : 'Annonce publiée.');
      onOpenChange(false);
      if (!editing) navigate(`/livres/${annonce._id}`);
    },
  });

  const champs = save.error?.champs || {};
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle>{editing ? 'Modifier l’annonce' : 'Publier une annonce'}</SheetTitle>
          <SheetDescription>{editing ? 'Les acheteurs voient les changements immédiatement.' : 'Visible par tous les étudiants du campus.'}</SheetDescription>
        </SheetHeader>
        <form
          id="book-form"
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <FormError error={save.error} />
          <Field label="Titre du livre" error={champs.titre}>
            <Input value={form.titre} onChange={set('titre')} placeholder="Ex. Probabilités et statistique pour ingénieurs" required />
          </Field>
          <Field label="Auteur" optional error={champs.auteur}>
            <Input value={form.auteur} onChange={set('auteur')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Catégorie" error={champs.categorie}>
              {(p) => (
                <Select value={form.categorie} onValueChange={set('categorie')}>
                  <SelectTrigger className="w-full" {...p}>
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
            <Field label="Matière" error={champs.matiere}>
              <Input value={form.matiere} onChange={set('matiere')} list={listId} placeholder="Ex. Analyse 1" required />
            </Field>
            <datalist id={listId}>
              {MATIERES.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
          <Field label="État" error={champs.etat}>
            {(p) => (
              <ToggleGroup type="single" variant="outline" value={form.etat} onValueChange={(v) => v && set('etat')(v)} className="w-full" {...p}>
                {ETATS.map((e) => (
                  <ToggleGroupItem key={e} value={e} className="flex-1 data-[state=on]:border-primary data-[state=on]:bg-primary-soft data-[state=on]:text-primary-soft-foreground">
                    {ETAT_LABELS[e]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Année d’édition" optional error={champs.anneeEdition}>
              <Input inputMode="numeric" value={form.anneeEdition} onChange={set('anneeEdition')} placeholder="2021" />
            </Field>
            <Field label="Prix neuf (DT)" optional error={champs.prixNeuf}>
              <Input inputMode="decimal" value={form.prixNeuf} onChange={set('prixNeuf')} placeholder="45" />
            </Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary-soft px-4 py-3" aria-live="polite">
            <span className="flex items-center gap-2 text-sm font-semibold text-primary-soft-foreground">
              <Sparkles className="size-4" /> Prix conseillé
            </span>
            {form.matiere.trim() && form.anneeEdition && form.prixNeuf ? (
              <div className="flex items-center gap-3">
                <SuggestionResult query={suggestion} compact />
                {suggestion.data && (
                  <Button type="button" size="xs" variant="outline" onClick={() => set('prix')(String(Math.round((suggestion.data.min + suggestion.data.max) / 2)))}>
                    Appliquer
                  </Button>
                )}
              </div>
            ) : (
              <span className="text-[13px] text-primary-soft-foreground/80">Indiquez la matière, l’année et le prix neuf</span>
            )}
          </div>
          <Field label="Votre prix (DT)" error={champs.prix}>
            <Input inputMode="decimal" value={form.prix} onChange={set('prix')} required className="font-mono" />
          </Field>
          <Field label="Description" optional error={champs.description} help="Annotations, pages manquantes, lieu de remise…">
            <Textarea rows={3} value={form.description} onChange={set('description')} maxLength={1000} />
          </Field>
          <Field label={`Photos (${photos.length}/${MAX_PHOTOS})`} error={champs.photos} help="La première photo sert de couverture.">
            {() => <PhotoPicker photos={photos} onChange={setPhotos} />}
          </Field>
        </form>
        <SheetFooter className="flex-row justify-end border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="book-form" disabled={save.isPending}>
            {save.isPending ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Publier'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
