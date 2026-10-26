import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/Field';
import { FormError } from '@/components/FormError';
import { PasswordInput } from '@/components/PasswordInput';
import { post } from '@/lib/api';
import { FILIERES, NIVEAUX } from '@/lib/constants';
import { useAuth } from '@/providers/AuthProvider';

const DOMAIN = '@campus.tn';

function clientErrors(form) {
  const e = {};
  if (form.email && !form.email.trim().toLowerCase().endsWith(DOMAIN)) e.email = `Utilisez votre adresse universitaire (${DOMAIN}).`;
  if (form.motDePasse && (form.motDePasse.length < 8 || !/\d/.test(form.motDePasse))) e.motDePasse = '8 caractères minimum, dont un chiffre.';
  return e;
}

export default function Inscription() {
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', filiere: '', niveau: '', motDePasse: '' });
  const [touched, setTouched] = useState({});
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const signup = useMutation({
    mutationFn: () => post('/auth/inscription', form),
    onSuccess: ({ utilisateur }) => {
      setUser(utilisateur);
      navigate('/verifier-email', { replace: true });
    },
  });

  const local = clientErrors(form);
  const server = signup.error?.champs || {};
  const err = (k) => server[k] || (touched[k] && local[k]);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target?.value ?? e }));
  const blur = (key) => () => setTouched((t) => ({ ...t, [key]: true }));

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold">Créer un compte</h1>
        <p className="text-sm text-muted-foreground">
          Déjà inscrit ?{' '}
          <Link to="/connexion" className="font-medium text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setTouched({ email: true, motDePasse: true });
          if (Object.keys(clientErrors(form)).length) return;
          signup.mutate();
        }}
      >
        <FormError error={signup.error} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom" error={server.prenom}>
            <Input autoComplete="given-name" value={form.prenom} onChange={set('prenom')} required autoFocus />
          </Field>
          <Field label="Nom" error={server.nom}>
            <Input autoComplete="family-name" value={form.nom} onChange={set('nom')} required />
          </Field>
        </div>
        <Field label="E-mail universitaire" error={err('email')}>
          <Input type="email" autoComplete="email" placeholder={`prenom.nom${DOMAIN}`} value={form.email} onChange={set('email')} onBlur={blur('email')} required />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[3fr_2fr]">
          <Field label="Filière" optional>
            {(p) => (
            <Select value={form.filiere} onValueChange={set('filiere')}>
              <SelectTrigger className="w-full" {...p}>
                <SelectValue placeholder="Choisir" />
              </SelectTrigger>
              <SelectContent>
                {FILIERES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            )}
          </Field>
          <Field label="Niveau" optional>
            {(p) => (
            <Select value={form.niveau} onValueChange={set('niveau')}>
              <SelectTrigger className="w-full" {...p}>
                <SelectValue placeholder="Choisir" />
              </SelectTrigger>
              <SelectContent>
                {NIVEAUX.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            )}
          </Field>
        </div>
        <Field label="Mot de passe" error={err('motDePasse')} help="8 caractères minimum, dont un chiffre.">
          <PasswordInput autoComplete="new-password" value={form.motDePasse} onChange={set('motDePasse')} onBlur={blur('motDePasse')} required />
        </Field>
        <Button type="submit" size="lg" className="mt-1" disabled={signup.isPending}>
          {signup.isPending ? 'Création du compte…' : 'Créer mon compte'}
        </Button>
        <p className="text-xs text-muted-foreground">
          En créant un compte, vous acceptez notre{' '}
          <Link to="/confidentialite" className="underline underline-offset-2 hover:text-foreground">
            politique de confidentialité
          </Link>
          .
        </p>
      </form>
    </div>
  );
}
