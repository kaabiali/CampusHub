import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/Field';
import { FormError } from '@/components/FormError';
import { PasswordInput } from '@/components/PasswordInput';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { safeReturn } from '@/components/layout/guards';
import { post } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

export default function Connexion() {
  const [form, setForm] = useState({ email: '', motDePasse: '' });
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const login = useMutation({
    mutationFn: () => post('/auth/connexion', form),
    onSuccess: ({ utilisateur }) => {
      setUser(utilisateur);
      navigate(utilisateur.emailVerifie ? safeReturn(params.get('retour')) : '/verifier-email', { replace: true });
    },
  });
  const champs = login.error?.champs || {};
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold">Connexion</h1>
        <p className="text-sm text-muted-foreground">
          Pas encore de compte ?{' '}
          <Link to={`/inscription${params.get('retour') ? `?retour=${encodeURIComponent(params.get('retour'))}` : ''}`} className="font-medium text-primary hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          login.mutate();
        }}
        noValidate
      >
        <FormError error={login.error} />
        <GoogleButton
          onSuccess={(utilisateur) => {
            setUser(utilisateur);
            navigate(safeReturn(params.get('retour')), { replace: true });
          }}
        />
        <div className="flex items-center gap-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          <span className="h-px flex-1 bg-border" />
          ou
          <span className="h-px flex-1 bg-border" />
        </div>
        <Field label="E-mail universitaire" error={champs.email}>
          <Input type="email" autoComplete="email" placeholder="prenom.nom@campus.tn" value={form.email} onChange={set('email')} required autoFocus />
        </Field>
        <Field label="Mot de passe" error={champs.motDePasse}>
          <PasswordInput autoComplete="current-password" value={form.motDePasse} onChange={set('motDePasse')} required />
        </Field>
        <Link to="/mot-de-passe-oublie" className="self-end text-sm font-medium text-primary hover:underline">
          Mot de passe oublié ?
        </Link>
        <Button type="submit" size="lg" disabled={login.isPending}>
          {login.isPending ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>
    </div>
  );
}
