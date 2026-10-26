import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/Field';
import { FormError } from '@/components/FormError';
import { post } from '@/lib/api';

export default function MotDePasseOublie() {
  const [email, setEmail] = useState('');
  const request = useMutation({ mutationFn: () => post('/auth/mot-de-passe-oublie', { email }) });

  if (request.isSuccess) {
    return (
      <div className="flex flex-col items-start gap-5">
        <span className="flex size-12 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
          <MailCheck className="size-6" strokeWidth={1.75} />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold">Consultez vos e-mails</h1>
          <p className="text-sm text-muted-foreground">
            Si un compte existe pour <strong className="font-semibold text-foreground">{email}</strong>, un lien de réinitialisation vient d’être envoyé. Il est valable 1 heure.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/connexion">Retour à la connexion</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <Link to="/connexion" className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Connexion
      </Link>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold">Mot de passe oublié</h1>
        <p className="text-sm text-muted-foreground">Indiquez votre adresse universitaire, nous vous enverrons un lien pour en choisir un nouveau.</p>
      </div>
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          request.mutate();
        }}
      >
        <FormError error={request.error} />
        <Field label="E-mail universitaire" error={request.error?.champs?.email}>
          <Input type="email" autoComplete="email" placeholder="prenom.nom@campus.tn" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </Field>
        <Button type="submit" size="lg" disabled={request.isPending}>
          {request.isPending ? 'Envoi…' : 'Envoyer le lien'}
        </Button>
      </form>
    </div>
  );
}
