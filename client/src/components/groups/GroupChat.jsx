import { useLayoutEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, Lock, MessageSquareText, SendHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { get, post } from '@/lib/api';
import { dayLong, fullName, isoDay, time } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { mergeMessage } from '@/providers/SocketProvider';

const PAGE_SIZE = 30;

function dayLabel(d) {
  const day = isoDay(d);
  if (day === isoDay()) return "Aujourd'hui";
  if (day === isoDay(new Date(Date.now() - 864e5))) return 'Hier';
  return dayLong(d);
}

export function GroupChat({ groupId, estMembre }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef(null);
  const stickToBottom = useRef(true);
  const [text, setText] = useState('');
  const [older, setOlder] = useState({ messages: [], plusAnciens: null, loading: false });

  const { data: head, error, isPending } = useQuery({
    queryKey: ['groupe-messages', groupId],
    queryFn: () => get(`/groupes/${groupId}/messages`, { limit: PAGE_SIZE }),
    enabled: estMembre,
    staleTime: 0,
  });

  const merged = new Map();
  for (const m of [...older.messages, ...(head?.messages ?? [])]) merged.set(m.clientId || m._id, m);
  const messages = [...merged.values()].sort((a, b) => new Date(a.dateEnvoi) - new Date(b.dateEnvoi));

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  if (!estMembre) {
    return (
      <section className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-xs" aria-labelledby="messagerie">
        <h2 id="messagerie" className="font-semibold">
          Messagerie du groupe
        </h2>
        <p className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
          <Lock className="size-4" /> Rejoignez le groupe pour lire et écrire dans la discussion.
        </p>
      </section>
    );
  }

  const setStatus = (clientId, statut) =>
    queryClient.setQueryData(['groupe-messages', groupId], (t) =>
      t ? { ...t, messages: t.messages.map((m) => (m.clientId === clientId && m.statut ? { ...m, statut } : m)) } : t,
    );

  const deliver = async (contenu, clientId) => {
    setStatus(clientId, 'envoi');
    try {
      const { message } = await post(`/groupes/${groupId}/messages`, { contenu, clientId });
      queryClient.setQueryData(['groupe-messages', groupId], (t) => mergeMessage(t, message));
    } catch (e) {
      setStatus(clientId, 'echec');
      toast.error(e.message);
    }
  };

  const send = () => {
    const contenu = text.trim();
    if (!contenu) return;
    const clientId = crypto.randomUUID();
    const optimistic = {
      _id: clientId,
      clientId,
      contenu,
      auteur: { _id: user._id, prenom: user.prenom, nom: user.nom, photoUrl: user.photoUrl },
      dateEnvoi: new Date().toISOString(),
      statut: 'envoi',
    };
    queryClient.setQueryData(['groupe-messages', groupId], (t) => (t ? { ...t, messages: [...t.messages, optimistic] } : t));
    setText('');
    stickToBottom.current = true;
    deliver(contenu, clientId);
  };

  const loadOlder = async () => {
    if (!messages.length) return;
    stickToBottom.current = false;
    setOlder((o) => ({ ...o, loading: true }));
    try {
      const page = await get(`/groupes/${groupId}/messages`, { avant: messages[0].dateEnvoi, limit: PAGE_SIZE });
      setOlder((o) => ({ messages: [...page.messages, ...o.messages], plusAnciens: page.plusAnciens, loading: false }));
    } catch (e) {
      toast.error(e.message);
      setOlder((o) => ({ ...o, loading: false }));
    }
  };

  const canLoadOlder = older.plusAnciens ?? head?.plusAnciens;
  const chatId = `group-chat-${groupId}`;

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border bg-card shadow-xs" aria-labelledby="messagerie">
      <div className="flex items-center gap-2.5 border-b px-4 py-3">
        <span className="flex size-8 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
          <MessageSquareText className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="messagerie" className="font-semibold">
            Messagerie du groupe
          </h2>
          <p className="text-xs text-muted-foreground">Visible uniquement par les membres.</p>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex min-h-[240px] max-h-[420px] flex-1 flex-col gap-1 overflow-y-auto bg-background px-3 py-4 sm:px-4"
        aria-live="polite"
      >
        {error ? (
          <p className="m-auto max-w-xs text-center text-sm text-muted-foreground">{error.message}</p>
        ) : isPending ? (
          <div className="flex flex-col gap-3" aria-hidden="true">
            <div className="h-9 w-2/3 rounded-lg bg-muted animate-pulse" />
            <div className="h-9 w-1/2 self-end rounded-lg bg-muted animate-pulse" />
            <div className="h-9 w-3/5 rounded-lg bg-muted animate-pulse" />
          </div>
        ) : (
          <>
            {canLoadOlder && (
              <Button variant="ghost" size="sm" className="self-center text-muted-foreground" onClick={loadOlder} disabled={older.loading}>
                {older.loading ? 'Chargement…' : 'Messages précédents'}
              </Button>
            )}
            {messages.length === 0 ? (
              <div className="m-auto flex max-w-xs flex-col items-center gap-2 text-center">
                <MessageSquareText className="size-6 text-muted-foreground" strokeWidth={1.75} />
                <p className="text-sm text-muted-foreground">Aucun message pour l’instant. Lancez la discussion avec les autres membres.</p>
              </div>
            ) : (
              messages.map((m, i) => {
                const mine = String(m.auteur?._id ?? m.auteur) === String(user._id);
                const prev = messages[i - 1];
                const newDay = !prev || isoDay(prev.dateEnvoi) !== isoDay(m.dateEnvoi);
                return (
                  <div key={m._id} className="flex flex-col">
                    {newDay && <p className="my-3 self-center rounded-full bg-muted px-3 py-0.5 text-xs font-medium text-muted-foreground">{dayLabel(m.dateEnvoi)}</p>}
                    <div className={cn('flex max-w-[85%] gap-2', mine ? 'flex-row-reverse self-end' : 'self-start')}>
                      {!mine && <UserAvatar user={m.auteur} className="mt-5 size-8 shrink-0" tone="muted" />}
                      <div className={cn('flex min-w-0 flex-col gap-1', mine ? 'items-end' : 'items-start')}>
                        {!mine && <span className="px-1 text-[11px] font-medium text-muted-foreground">{fullName(m.auteur)}</span>}
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
                        <span className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
                          {time(m.dateEnvoi)}
                          {mine && m.statut === 'envoi' && <span>· Envoi…</span>}
                          {mine && m.statut === 'echec' && (
                            <button type="button" onClick={() => deliver(m.contenu, m.clientId)} className="inline-flex items-center gap-1 font-medium text-destructive hover:underline">
                              <CircleAlert className="size-3" /> Non envoyé · Réessayer
                            </button>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      <form
        className="flex items-end gap-2 border-t bg-card p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label className="sr-only" htmlFor={chatId}>
          Votre message au groupe
        </label>
        <textarea
          id={chatId}
          rows={1}
          value={text}
          maxLength={2000}
          placeholder="Écrire au groupe"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          className="max-h-[140px] min-h-10 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <Button type="submit" size="icon" className="size-10" disabled={!text.trim()} aria-label="Envoyer">
          <SendHorizontal />
        </Button>
      </form>
    </section>
  );
}
