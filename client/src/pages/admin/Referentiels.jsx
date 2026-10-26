import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/PageHeader';
import { FormError } from '@/components/FormError';
import { TagInput } from '@/components/TagInput';
import { del, get, patch, post, api } from '@/lib/api';

function useAdminMutation(mutationFn, success, keys) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      toast.success(success);
      keys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e) => toast.error(e.champs ? Object.values(e.champs)[0] : e.message),
  });
}

function CategoryRow({ cat }) {
  const [editing, setEditing] = useState(false);
  const [nom, setNom] = useState(cat.nom);
  const rename = useAdminMutation(() => patch(`/admin/categories/${cat._id}`, { nom }), 'Catégorie renommée.', ['categories']);
  const remove = useAdminMutation(() => del(`/admin/categories/${cat._id}`), 'Catégorie supprimée.', ['categories']);
  return (
    <li className="flex items-center gap-2 border-t py-2 first:border-t-0">
      {editing ? (
        <form
          className="flex flex-1 items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            rename.mutate(undefined, { onSuccess: () => setEditing(false) });
          }}
        >
          <Input value={nom} onChange={(e) => setNom(e.target.value)} autoFocus aria-label="Nom de la catégorie" className="h-8" onKeyDown={(e) => e.key === 'Escape' && setEditing(false)} />
          <Button size="icon-sm" type="submit" aria-label="Enregistrer">
            <Check />
          </Button>
          <Button size="icon-sm" variant="ghost" type="button" aria-label="Annuler" onClick={() => { setNom(cat.nom); setEditing(false); }}>
            <X />
          </Button>
        </form>
      ) : (
        <>
          <span className="flex-1 text-sm font-medium">{cat.nom}</span>
          <Button size="icon-sm" variant="ghost" aria-label={`Renommer ${cat.nom}`} onClick={() => setEditing(true)}>
            <Pencil />
          </Button>
          <Button size="icon-sm" variant="ghost" className="text-destructive hover:bg-destructive-soft hover:text-destructive" aria-label={`Supprimer ${cat.nom}`} onClick={() => remove.mutate()}>
            <Trash2 />
          </Button>
        </>
      )}
    </li>
  );
}

function Categories() {
  const { data = [] } = useQuery({ queryKey: ['categories'], queryFn: () => get('/categories').then((r) => r.categories) });
  const [nom, setNom] = useState('');
  const create = useAdminMutation(() => post('/admin/categories', { nom }), 'Catégorie ajoutée.', ['categories']);
  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-5 shadow-xs" aria-labelledby="cats">
      <div>
        <h2 id="cats" className="font-semibold">
          Catégories de livres
        </h2>
        <p className="text-[13px] text-muted-foreground">Une catégorie utilisée par des annonces ne peut pas être supprimée.</p>
      </div>
      <ul>
        {data.map((c) => (
          <CategoryRow key={c._id} cat={c} />
        ))}
      </ul>
      <form
        className="flex gap-2 border-t pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate(undefined, { onSuccess: () => setNom('') });
        }}
      >
        <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nouvelle catégorie" aria-label="Nouvelle catégorie" />
        <Button type="submit" variant="outline" disabled={!nom.trim() || create.isPending}>
          <Plus /> Ajouter
        </Button>
      </form>
    </section>
  );
}

function ClubCard({ club }) {
  const [emails, setEmails] = useState(club.responsables.map((r) => r.email));
  const dirty = emails.join() !== club.responsables.map((r) => r.email).join();
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: () => api.put(`/clubs/${club._id}/responsables`, { emails }),
    onSuccess: () => {
      toast.success(`Responsables de ${club.nom} enregistrés.`);
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
  });
  return (
    <li className="flex flex-col gap-2.5 border-t py-4 first:border-t-0 first:pt-0">
      <div>
        <p className="font-semibold">{club.nom}</p>
        {club.description && <p className="text-[13px] text-muted-foreground">{club.description}</p>}
      </div>
      <FormError error={save.error} />
      {save.error?.champs?.emails && <p className="text-[13px] text-destructive">{save.error.champs.emails}</p>}
      <TagInput value={emails} onChange={setEmails} placeholder="prenom.nom@campus.tn puis Entrée" max={10} aria-label={`Responsables de ${club.nom}`} />
      {dirty && (
        <Button size="sm" className="self-start" disabled={save.isPending} onClick={() => save.mutate()}>
          Enregistrer les responsables
        </Button>
      )}
    </li>
  );
}

function Clubs() {
  const { data = [] } = useQuery({ queryKey: ['clubs', 'tous'], queryFn: () => get('/clubs').then((r) => r.clubs) });
  const [nom, setNom] = useState('');
  const create = useAdminMutation(() => post('/clubs', { nom }), 'Club créé.', ['clubs']);
  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-card p-5 shadow-xs" aria-labelledby="clubs">
      <div>
        <h2 id="clubs" className="font-semibold">
          Clubs et responsables
        </h2>
        <p className="text-[13px] text-muted-foreground">Seuls les responsables désignés peuvent publier des événements au nom du club.</p>
      </div>
      {data.length === 0 ? <p className="text-sm text-muted-foreground">Aucun club pour le moment.</p> : <ul>{data.map((c) => <ClubCard key={c._id} club={c} />)}</ul>}
      <form
        className="flex gap-2 border-t pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate(undefined, { onSuccess: () => setNom('') });
        }}
      >
        <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom du club" aria-label="Nom du nouveau club" />
        <Button type="submit" variant="outline" disabled={!nom.trim() || create.isPending}>
          <Plus /> Créer
        </Button>
      </form>
    </section>
  );
}

export default function Referentiels() {
  return (
    <>
      <PageHeader title="Catégories et clubs" description="Les listes de référence utilisées par les annonces et les événements." />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Categories />
        <Clubs />
      </div>
    </>
  );
}
