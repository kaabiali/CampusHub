import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { post } from '@/lib/api';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CONSOLE_URL = 'https://console.cloud.google.com/apis/credentials';
const ORIGIN = typeof window === 'undefined' ? 'http://localhost:5173' : window.location.origin;

function GoogleLogo() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className="size-4">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

// Google renders nothing at all when the page origin is not whitelisted for the client ID,
// so an empty (0x0) iframe is the only signal we get.
const openConsole = () => window.open(CONSOLE_URL, '_blank', 'noopener,noreferrer');

function FallbackButton({ reason }) {
  const onClick = () => {
    if (reason === 'missing') {
      toast.error('La connexion avec Google n’est pas configurée.', {
        description: 'Renseignez GOOGLE_CLIENT_ID (serveur) et VITE_GOOGLE_CLIENT_ID (client), puis redémarrez.',
        action: { label: 'Google Cloud', onClick: openConsole },
      });
      return;
    }
    toast.error('Google refuse cette adresse.', {
      description: `Ajoutez ${ORIGIN} aux « Origines JavaScript autorisées » de votre ID client OAuth.`,
      action: { label: 'Google Cloud', onClick: openConsole },
    });
  };

  return (
    <Button type="button" variant="outline" size="lg" className="w-full" onClick={onClick}>
      <GoogleLogo />
      Continuer avec Google
    </Button>
  );
}

/**
 * Google Identity Services button. The ID token is verified server-side; any verified
 * Google account is accepted (see POST /api/auth/google).
 */
export function GoogleButton({ onSuccess }) {
  const containerRef = useRef(null);
  const successRef = useRef(onSuccess);
  // 'loading' until the official button paints; 'blocked' when Google refuses the origin.
  const [status, setStatus] = useState(CLIENT_ID ? 'loading' : 'missing');
  successRef.current = onSuccess;

  useEffect(() => {
    if (!CLIENT_ID || !containerRef.current) return undefined;
    let cancelled = false;
    let timer;

    const measure = () => {
      const iframe = containerRef.current?.querySelector('iframe');
      return iframe ? iframe.getBoundingClientRect().width : 0;
    };

    const init = () => {
      if (cancelled || !window.google?.accounts?.id || !containerRef.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        ux_mode: 'popup',
        auto_select: false,
        locale: 'fr',
        callback: async ({ credential }) => {
          if (!credential) {
            toast.error('La connexion Google a été annulée.');
            return;
          }
          try {
            const { utilisateur } = await post('/auth/google', { credential });
            successRef.current?.(utilisateur);
          } catch (err) {
            toast.error(err.message || 'La connexion avec Google a échoué.');
          }
        },
      });

      containerRef.current.innerHTML = '';
      const width = Math.round(Math.min(400, Math.max(200, containerRef.current.offsetWidth || 368)));
      window.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width,
      });

      let tries = 0;
      timer = window.setInterval(() => {
        if (cancelled) return;
        if (measure() > 0) {
          window.clearInterval(timer);
          setStatus('ready');
        } else if (++tries > 16) {
          window.clearInterval(timer);
          setStatus('blocked');
        }
      }, 250);
    };

    if (window.google?.accounts?.id) {
      init();
      return () => {
        cancelled = true;
        window.clearInterval(timer);
      };
    }

    let script = document.querySelector('script[data-google-gsi]');
    const onLoad = () => init();
    const onError = () => {
      if (!cancelled) {
        setStatus('blocked');
        toast.error('Impossible de charger la connexion Google. Vérifiez votre connexion réseau.');
      }
    };
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.googleGsi = 'true';
      document.head.appendChild(script);
    }
    script.addEventListener('load', onLoad);
    script.addEventListener('error', onError);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
    };
  }, []);

  const unavailable = status === 'blocked' || status === 'missing';

  return (
    <div className="flex flex-col gap-2">
      {/* Kept mounted (and visible while loading) so the iframe can be measured. */}
      <div
        ref={containerRef}
        className={unavailable ? 'hidden' : 'flex min-h-10 w-full justify-center [&>div]:max-w-full'}
      />
      {unavailable && <FallbackButton reason={status} />}
      {status === 'loading' && <p className="text-center text-xs text-muted-foreground">Chargement de Google…</p>}
    </div>
  );
}
