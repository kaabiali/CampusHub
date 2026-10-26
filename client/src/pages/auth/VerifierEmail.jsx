import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { CircleCheck, CircleX, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { post } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

const RESEND_COOLDOWN = 60;

function StatusIcon({ icon: Icon, tone }) {
  const tones = { primary: 'bg-primary-soft text-primary-soft-foreground', success: 'bg-success-soft text-success', danger: 'bg-destructive-soft text-destructive' };
  return (
    <span className={`flex size-12 items-center justify-center rounded-lg ${tones[tone]}`}>
      <Icon className="size-6" strokeWidth={1.75} />
    </span>
  );
}

function ConfirmToken({ jeton }) {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const started = useRef(false);
  const confirm = useMutation({ mutationFn: () => post('/auth/verifier', { jeton }), onSuccess: ({ utilisateur }) => setUser(utilisateur) });

  useEffect(() => {
    // StrictMode mounts twice in dev; the token is single-use, so only send it once.
    if (started.current) return;
    started.current = true;
    confirm.mutate();
  }, [confirm]);

  if (confirm.isError) {
    return (
      <div className="flex flex-col items-start gap-5">
        <StatusIcon icon={CircleX} tone="danger" />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold">Lien invalide</h1>
          <p className="text-sm text-muted-foreground">{confirm.error.message}</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/verifier-email">Recevoir un nouveau lien</Link>
        </Button>
      </div>
    );
  }
  if (confirm.isSuccess) {
    return (
      <div className="flex flex-col items-start gap-5">
        <StatusIcon icon={CircleCheck} tone="success" />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold">Adresse confirmée</h1>
          <p className="text-sm text-muted-foreground">Ajoutez vos matières dans votre profil pour recevoir des recommandations de groupes et d’événements.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/profil', { replace: true })}>Compléter mon profil</Button>
          <Button variant="ghost" onClick={() => navigate('/accueil', { replace: true })}>
            Plus tard
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="size-12 rounded-lg bg-muted animate-pulse" />
      <div className="h-7 w-56 rounded-md bg-muted animate-pulse" />
      <div className="h-4 w-full rounded-md bg-muted/70 animate-pulse" />
    </div>
  );
}

function WaitForEmail() {
  const { user, isLoading, logout } = useAuth();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resend = useMutation({
    mutationFn: () => post('/auth/renvoyer-verification'),
    onSuccess: (r) => {
      setCooldown(RESEND_COOLDOWN);
      if (r.mailEnvoye) toast.success('Nouveau lien envoyé.');
      else toast.error("L'e-mail n'a pas pu être envoyé. Réessayez dans un instant.");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return null;
  if (!user) return <Navigate to="/connexion" replace />;
  if (user.emailVerifie) return <Navigate to="/accueil" replace />;

  return (
    <div className="flex flex-col items-start gap-6">
      <StatusIcon icon={MailCheck} tone="primary" />
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold">Vérifiez votre boîte de réception</h1>
        <p className="text-sm text-muted-foreground">
          Nous avons envoyé un lien de confirmation à <strong className="font-semibold text-foreground">{user.email}</strong>. Il est valable 24 heures.
        </p>
      </div>
      {import.meta.env.DEV && (
        <p className="rounded-md bg-muted px-3 py-2 text-[13px] text-foreground-2">
          En local, les e-mails arrivent dans Mailpit :{' '}
          <a href="http://localhost:8025" target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
            localhost:8025
          </a>
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => resend.mutate()} disabled={resend.isPending || cooldown > 0}>
          {cooldown > 0 ? `Renvoyer dans ${cooldown} s` : 'Renvoyer le lien'}
        </Button>
        <Button variant="ghost" onClick={() => logout('/inscription')}>
          Utiliser une autre adresse
        </Button>
      </div>
    </div>
  );
}

export default function VerifierEmail() {
  const [params] = useSearchParams();
  const jeton = params.get('jeton');
  return jeton ? <ConfirmToken jeton={jeton} /> : <WaitForEmail />;
}
