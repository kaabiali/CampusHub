import { useMemo, useRef, useState } from 'react';
import { NavLink } from 'react-router';
import { MessageCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/UserAvatar';
import { fullName, relative } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { useSocket } from '@/providers/SocketProvider';

const fold = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function ConversationList({ conversations, isPending }) {
  const { user } = useAuth();
  const { typing } = useSocket();
  const [q, setQ] = useState('');
  const listRef = useRef(null);

  const shown = useMemo(() => (q ? conversations?.filter((c) => fold(fullName(c.avec)).includes(fold(q))) : conversations), [conversations, q]);

  const onKeyDown = (e) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const links = [...listRef.current.querySelectorAll('a')];
    const i = links.indexOf(document.activeElement);
    const next = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: links.length - 1 }[e.key];
    if (links[next]) {
      e.preventDefault();
      links[next].focus();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b p-3">
        <label className="relative block">
          <span className="sr-only">Rechercher une conversation</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher" className="pl-9" />
        </label>
      </div>
      <nav ref={listRef} onKeyDown={onKeyDown} aria-label="Conversations" className="min-h-0 flex-1 overflow-y-auto">
        {isPending ? (
          Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 border-b px-3.5 py-3.5" aria-hidden="true">
              <div className="size-10 rounded-full bg-muted animate-pulse" />
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="h-3.5 w-28 rounded bg-muted animate-pulse" />
                <div className="h-3 w-40 rounded bg-muted/70 animate-pulse" />
              </div>
            </div>
          ))
        ) : !shown?.length ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-sm text-muted-foreground">
            <MessageCircle className="size-5" />
            {q ? 'Aucune conversation ne correspond.' : 'Aucune conversation. Contactez un vendeur ou un conducteur depuis son annonce.'}
          </div>
        ) : (
          shown.map((c) => {
            const mine = String(c.dernier.expediteur) === String(user._id);
            const isTyping = typing[String(c.avec._id)];
            return (
              <NavLink
                key={c.avec._id}
                to={`/messages/${c.avec._id}`}
                className={({ isActive }) =>
                  cn('flex items-center gap-3 border-b px-3.5 py-3 transition-colors duration-150 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none', isActive && 'bg-primary-soft hover:bg-primary-soft')
                }
              >
                <UserAvatar user={c.avec} className="size-10" tone="muted" />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={cn('truncate text-sm', c.nonLus ? 'font-bold' : 'font-semibold')}>{fullName(c.avec)}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{relative(c.dernier.dateEnvoi)}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className={cn('truncate text-[13px]', isTyping ? 'text-primary italic' : c.nonLus ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                      {isTyping ? 'écrit…' : `${mine ? 'Vous : ' : ''}${c.dernier.contenu}`}
                    </span>
                    {c.nonLus > 0 && <span className="shrink-0 rounded-full bg-primary px-1.5 text-[11px] leading-[18px] font-bold text-primary-foreground tabular">{c.nonLus}</span>}
                  </span>
                </span>
              </NavLink>
            );
          })
        )}
      </nav>
    </div>
  );
}
