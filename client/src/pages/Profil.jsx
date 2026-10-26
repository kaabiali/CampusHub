import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/Field';
import { FormError } from '@/components/FormError';
import { PageHeader } from '@/components/PageHeader';
import { PasswordInput } from '@/components/PasswordInput';
import { TagInput } from '@/components/TagInput';
import { UserAvatar } from '@/components/UserAvatar';
import { api, patch } from '@/lib/api';
import { CENTRES_INTERET, FILIERES, MATIERES, NIVEAUX } from '@/lib/constants';
import { fullName } from '@/lib/format';
import { useAuth } from '@/providers/AuthProvider';

function Section({ title, description, children }) {
  return (
    <section className="grid gap-6 border-t py-8 first:border-t-0 first:pt-0 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="max-w-xl">{children}</div>
    </section>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <Field label={label}>
      {(p) => (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full" {...p}>
            <SelectValue placeholder="Choisir" />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </Field>
  );
}

function PhotoSection() {
  const { user, setUser } = useAuth();
  const inputRef = useRef(null);
  const upload = useMutation({
    mutationFn: (file) => {
      const data = new FormData();
      data.append('photo', file);
      return api.post('/utilisateurs/moi/photo', data).then((r) => r.data);
    },
    onMutate: (file) => {
      const previous = user;
      setUser({ ...user, photoUrl: URL.createObjectURL(file) });
      return { previous };
    },
    onSuccess: ({ utilisateur }) => {
      setUser(utilisateur);
      toast.success('Photo mise à jour.');
    },
    onError: (err, file, ctx) => {
      setUser(ctx.previous);
      toast.error(err.message);
    },
  });

  return (
    <div className="flex items-center gap-5">
      <UserAvatar user={user} className="size-20 text-lg" />
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Choisir une photo de profil"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) return toast.error('Image trop lourde (5 Mo maximum).');
            upload.mutate(file);
          }}
        />
        <Button variant="outline" size="sm" className="self-start" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
          <Camera /> {upload.isPending ? 'Envoi…' : 'Changer la photo'}
        </Button>
        <p className="text-xs text-muted-foreground">JPG, PNG ou WebP, 5 Mo maximum.</p>
      </div>
    </div>
  );
}

function InfoSection() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    prenom: user.prenom,
    nom: user.nom,
    filiere: user.filiere,
    niveau: user.niveau,
    matieres: user.matieres,
    centresInteret: user.centresInteret,
  });
  const save = useMutation({
    mutationFn: () => patch('/utilisateurs/moi', form),
    onSuccess: ({ utilisateur }) => {
      setUser(utilisateur);
      toast.success('Profil enregistré.');
    },
  });
  const champs = save.error?.champs || {};
  const set = (key) => (v) => setForm((f) => ({ ...f, [key]: v?.target ? v.target.value : v }));

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <FormError error={save.error} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom" error={champs.prenom}>
          <Input value={form.prenom} onChange={set('prenom')} required />
        </Field>
        <Field label="Nom" error={champs.nom}>
          <Input value={form.nom} onChange={set('nom')} required />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-[3fr_2fr]">
        <SelectField label="Filière" value={form.filiere} onChange={set('filiere')} options={FILIERES} />
        <SelectField label="Niveau" value={form.niveau} onChange={set('niveau')} options={NIVEAUX} />
      </div>
      <Field label="Matières suivies" error={champs.matieres} help="Servent à recommander groupes, livres et événements. Entrée pour ajouter.">
        <TagInput value={form.matieres} onChange={set('matieres')} suggestions={MATIERES} placeholder="Ex. Probabilités" />
      </Field>
      <Field label="Centres d’intérêt" error={champs.centresInteret}>
        <TagInput value={form.centresInteret} onChange={set('centresInteret')} suggestions={CENTRES_INTERET} placeholder="Ex. Data et IA" />
      </Field>
      <Button type="submit" className="self-start" disabled={save.isPending}>
        {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </form>
  );
}

function PasswordSection() {
  const [form, setForm] = useState({ actuel: '', nouveau: '' });
  const change = useMutation({
    mutationFn: () => patch('/utilisateurs/moi/mot-de-passe', form),
    onSuccess: () => {
      setForm({ actuel: '', nouveau: '' });
      toast.success('Mot de passe modifié. Vos autres sessions sont déconnectées.');
    },
  });
  const champs = change.error?.champs || {};
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        change.mutate();
      }}
    >
      <FormError error={change.error} />
      <Field label="Mot de passe actuel" error={champs.actuel}>
        <PasswordInput autoComplete="current-password" value={form.actuel} onChange={(e) => setForm((f) => ({ ...f, actuel: e.target.value }))} required />
      </Field>
      <Field label="Nouveau mot de passe" error={champs.nouveau} help="8 caractères minimum, dont un chiffre.">
        <PasswordInput autoComplete="new-password" value={form.nouveau} onChange={(e) => setForm((f) => ({ ...f, nouveau: e.target.value }))} required />
      </Field>
      <Button type="submit" variant="outline" className="self-start" disabled={change.isPending}>
        {change.isPending ? 'Modification…' : 'Modifier le mot de passe'}
      </Button>
    </form>
  );
}

export default function Profil() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader title="Mon profil" description={`${fullName(user)} · ${user.email}`} />
      <div className="rounded-lg border bg-card px-5 py-8 shadow-xs sm:px-8">
        <Section title="Photo" description="Visible par les vendeurs, conducteurs et membres de vos groupes.">
          <PhotoSection />
        </Section>
        <Section title="Informations" description="Votre filière et vos matières personnalisent les recommandations.">
          <InfoSection />
        </Section>
        <Section title="Mot de passe" description="Changer le mot de passe déconnecte vos autres appareils.">
          <PasswordSection />
        </Section>
      </div>
    </>
  );
}
