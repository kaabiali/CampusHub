import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, CheckCheck, CircleAlert, SendHorizontal, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { useSendMessage } from '@/hooks/useSendMessage';
import { get, post } from '@/lib/api';
import { dayLong, fullName, isoDay, time } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { useSocket } from '@/providers/SocketProvider';

const CONTEXT_LINKS = { ANNONCE: '/livres/', TRAJET: '/covoiturage/', EVENEMENT: '/evenements/' };
const CONTEXT_LABELS = { ANNONCE: 'Annonce', TRAJET: 'Trajet', EVENEMENT: 'Événement' };

function dayLabel(d) {
  const day = isoDay(d);
  if (day === isoDay()) return "Aujourd'hui";
  if (day === isoDay(new Date(Date.now() - 864e5))) return 'Hier';
  return dayLong(d);
}

function Status({ message, onRetry }) {
  if (message.statut === 'envoi') return <span>Envoi…</span>;
  if (message.statut === 'echec')
    return (
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 font-medium text-destructive hover:underline">
        <CircleAlert className="size-3" /> Non envoyé · Réessayer
      </button>
    );
  return message.lu ? (
    <span className="inline-flex items-center gap-1 text-primary">
      <CheckCheck className="size-3.5" /> Lu
    </span>
  ) : (
    <span className="inline-flex items-center gap-1">
      <Check className="size-3.5" /> Envoyé
    </span>
  );
}

function Composer({ onSend, onTyping }) {
  const [text, setText] = useState('');
  const ref = useRef(null);
  const lastTyping = useRef(0);

  useLayoutEffect(() => {
    const el = ref.current;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text]);

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    onSend(value);
    onTyping(false);
    lastTyping.current = 0;
    setText('');
    ref.current.focus();
  };

  return (
    <form
      className="flex items-end gap-2 border-t bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label className="sr-only" htmlFor="composer">
        Votre message
      </label>
      <textarea
        id="composer"
        ref={ref}
        rows={1}
        value={text}
        maxLength={2000}
        placeholder="Écrire un message"
        onChange={(e) => {
          setText(e.target.value);
          if (Date.now() - lastTyping.current > 2000) {
            lastTyping.current = Date.now();
            onTyping(true);
          }
        }}
        onBlur={() => onTyping(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        className="max-h-[140px] min-h-10 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      <Button type="submit" size="icon" className="size-10" disabled={!text.trim()} aria-label="Envoyer">
        <SendHorizontal />
      </Button>
    </form>
  );
}

export function Thread({ otherId, contexte }) {
  const { user } = useAuth();
  const { socket, typing, setActiveThread } = useSocket();
  const queryClient = useQueryClient();
  const scrollRef = useRef(null);
  const stickToBottom = useRef(true);
  const { send, retry } = useSendMessage(otherId, contexte);

  const { data: head, error } = useQuery({
    queryKey: ['thread', otherId],
    queryFn: async () => {
      const fresh = await get(`/conversations/${otherId}/messages`, { limit: 40 });
      // A refetch (e.g. after reconnecting) must not drop messages still sending or awaiting a retry.
      const unsent = (queryClient.getQueryData(['thread', otherId])?.messages ?? []).filter((m) => m.statut && !fresh.messages.some((f) => f.clientId === m.clientId));
      return { ...fresh, messages: [...fresh.messages, ...unsent] };
    },
    staleTime: 0,
  });
  const [older, setOlder] = useState({ messages: [], plusAnciens: null, loading: false });
  useEffect(() => setOlder({ messages: [], plusAnciens: null, loading: false }), [otherId]);

  useEffect(() => {
    setActiveThread(otherId);
    return () => setActiveThread(null);
  }, [otherId, setActiveThread]);

  const unreadFromOther = head?.messages?.some((m) => String(m.expediteur) === String(otherId) && !m.lu);
  useEffect(() => {
    if (!unreadFromOther) return;
    post(`/conversations/${otherId}/lu`).then(() => {
      queryClient.setQueryData(['thread', otherId], (t) => (t ? { ...t, messages: t.messages.map((m) => (String(m.expediteur) === String(otherId) ? { ...m, lu: true } : m)) } : t));
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });
  }, [unreadFromOther, otherId, queryClient]);

  const messages = [...older.messages, ...(head?.messages ?? [])];
  // Only messages that arrive while the thread is open animate in; history renders at rest.
  const initialIds = useRef(null);
  if (head && !initialIds.current) initialIds.current = new Set(head.messages.map((m) => m._id));

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, typing[otherId]]);

  if (error) {
    return <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">{error.message}</div>;
  }
  const other = head?.avec;
  const ctx = [...messages].reverse().find((m) => m.contexte)?.contexte || contexte;
  const loadOlder = async () => {
    stickToBottom.current = false;
    setOlder((o) => ({ ...o, loading: true }));
    const page = await get(`/conversations/${otherId}/messages`, { avant: messages[0].dateEnvoi, limit: 40 });
    setOlder((o) => ({ messages: [...page.messages, ...o.messages], plusAnciens: page.plusAnciens, loading: false }));
  };
  const canLoadOlder = older.plusAnciens ?? head?.plusAnciens;

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label={other ? `Conversation avec ${fullName(other)}` : 'Conversation'}>
      <header className="flex items-center gap-3 border-b bg-card px-3 py-2.5 sm:px-4">
        <Link to="/messages" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent md:hidden" aria-label="Retour aux conversations">
          <ArrowLeft className="size-5" />
        </Link>
        {other ? (
          <>
            <UserAvatar user={other} className="size-9" tone="muted" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{fullName(other)}</p>
              <p className="truncate text-xs text-muted-foreground">{typing[otherId] ? <span className="text-primary">écrit…</span> : other.filiere || 'Étudiant'}</p>
            </div>
            {ctx?.libelle && CONTEXT_LINKS[ctx.type] && (
              <Link to={`${CONTEXT_LINKS[ctx.type]}${ctx.ref}`} className="hidden max-w-[45%] items-center gap-1.5 truncate rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent sm:inline-flex">
                <Tag className="size-3.5 shrink-0 text-primary" />
                <span className="truncate">
                  {CONTEXT_LABELS[ctx.type]} : {ctx.libelle}
                </span>
              </Link>
            )}
          </>
        ) : (
          <div className="h-9 w-48 rounded bg-muted animate-pulse" />
        )}
      </header>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto bg-background px-3 py-4 sm:px-5"
        aria-live="polite"
      >
        {canLoadOlder && (
          <Button variant="ghost" size="sm" className="self-center text-muted-foreground" onClick={loadOlder} disabled={older.loading}>
            {older.loading ? 'Chargement…' : 'Messages précédents'}
          </Button>
        )}
        {!head ? (
          <div className="flex flex-col gap-3" aria-hidden="true">
            <div className="h-10 w-2/3 rounded-lg bg-muted animate-pulse" />
            <div className="h-10 w-1/2 self-end rounded-lg bg-muted animate-pulse" />
            <div className="h-10 w-3/5 rounded-lg bg-muted animate-pulse" />
          </div>
        ) : messages.length === 0 ? (
          <p className="m-auto max-w-xs text-center text-sm text-muted-foreground">
            {contexte ? 'Écrivez votre premier message : il sera rattaché à l’élément que vous consultiez.' : `Démarrez la conversation avec ${other?.prenom}.`}
          </p>
        ) : (
          messages.map((m, i) => {
            const mine = String(m.expediteur) === String(user._id);
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const newDay = !prev || isoDay(prev.dateEnvoi) !== isoDay(m.dateEnvoi);
            const lastOfGroup = !next || String(next.expediteur) !== String(m.expediteur) || isoDay(next.dateEnvoi) !== isoDay(m.dateEnvoi);
            return (
              <div key={m._id} className="flex flex-col">
                {newDay && <p className="my-3 self-center rounded-full bg-muted px-3 py-0.5 text-xs font-medium text-muted-foreground first-letter:uppercase">{dayLabel(m.dateEnvoi)}</p>}
                <div className={cn('flex max-w-[78%] flex-col gap-1', !initialIds.current?.has(m._id) && 'animate-fade-up', mine ? 'items-end self-end' : 'items-start self-start')}>
                  <p
                    className={cn(
                      'rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words',
                      mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md border bg-card',
                      m.statut === 'envoi' && 'opacity-70',
                      m.statut === 'echec' && 'bg-destructive-soft text-destructive',
                    )}
                  >
                    {m.contenu}
                  </p>
                  {lastOfGroup && (
                    <span className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      {time(m.dateEnvoi)}
                      {mine && (
                        <>
                          <span aria-hidden="true">·</span>
                          <Status message={m} onRetry={() => retry(m)} />
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        {typing[otherId] && (
          <div className="flex items-center gap-1 self-start rounded-2xl rounded-bl-md border bg-card px-3.5 py-3" aria-label={`${other?.prenom} écrit`}>
            {[0, 1, 2].map((d) => (
              <span key={d} className="size-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${d * 120}ms` }} />
            ))}
          </div>
        )}
      </div>
      <Composer
        onSend={(text) => {
          stickToBottom.current = true;
          send(text);
        }}
        onTyping={(actif) => socket?.emit('typing', { destinataire: otherId, actif })}
      />
    </section>
  );
}
