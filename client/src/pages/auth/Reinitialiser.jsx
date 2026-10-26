import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/Field';
import { FormError } from '@/components/FormError';
import { PasswordInput } from '@/components/PasswordInput';
import { post } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

export default function Reinitialiser() {
  const [params] = useSearchParams();
  const jeton = params.get('jeton');
  const [form, setForm] = useState({ motDePasse: '', confirmation: '' });
  const [mismatch, setMismatch] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const reset = useMutation({
    mutationFn: () => post('/auth/reinitialiser', { jeton, motDePasse: form.motDePasse }),
    onSuccess: ({ utilisateur }) => {
      setUser(utilisateur);
      toast.success('Mot de passe modifié.');
      navigate('/accueil', { replace: true });
    },
  });

  if (!jeton) {
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-2xl font-semibold">Lien incomplet</h1>
        <p className="text-sm text-muted-foreground">Ce lien de réinitialisation ne contient pas de jeton. Faites une nouvelle demande.</p>
        <Button asChild variant="outline">
          <Link to="/mot-de-passe-oublie">Nouvelle demande</Link>
        </Button>
      </div>
    );
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold">Nouveau mot de passe</h1>
        <p className="text-sm text-muted-foreground">Vos autres sessions seront déconnectées.</p>
      </div>
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const differs = form.motDePasse !== form.confirmation;
          setMismatch(differs);
          if (!differs) reset.mutate();
        }}
      >
        <FormError error={reset.error} />
        {reset.error?.code === 'JETON_INVALIDE' && (
          <Link to="/mot-de-passe-oublie" className="text-sm font-medium text-primary hover:underline">
            Demander un nouveau lien
          </Link>
        )}
        <Field label="Nouveau mot de passe" error={reset.error?.champs?.motDePasse} help="8 caractères minimum, dont un chiffre.">
          <PasswordInput autoComplete="new-password" value={form.motDePasse} onChange={set('motDePasse')} required autoFocus />
        </Field>
        <Field label="Confirmation" error={mismatch ? 'Les deux mots de passe ne correspondent pas.' : undefined}>
          <PasswordInput autoComplete="new-password" value={form.confirmation} onChange={set('confirmation')} required />
        </Field>
        <Button type="submit" size="lg" disabled={reset.isPending}>
          {reset.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </form>
    </div>
  );
}
