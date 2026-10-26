import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, CalendarDays, CarFront, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { get, post } from '@/lib/api';
import { relative } from '@/lib/format';
import { cn } from '@/lib/utils';

const ICONS = { RESERVATION: CarFront, MESSAGE: MessageCircle, RAPPEL_EVENEMENT: CalendarDays };

export function useNotifications() {
  return useQuery({ queryKey: ['notifications'], queryFn: () => get('/notifications', { limit: 20 }), staleTime: 60_000 });
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useNotifications();
  const unread = data?.nonLues ?? 0;

  const markRead = useMutation({
    mutationFn: (ids) => post('/notifications/lues', ids ? { ids } : {}),
    onMutate: (ids) => {
      queryClient.setQueryData(['notifications'], (d) =>
        d ? { notifications: d.notifications.map((n) => (!ids || ids.includes(n._id) ? { ...n, lue: true } : n)), nonLues: ids ? Math.max(0, d.nonLues - ids.length) : 0 } : d,
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unread ? `Notifications, ${unread} non lue${unread > 1 ? 's' : ''}` : 'Notifications'}>
          <Bell />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-bold text-primary-foreground tabular animate-fade-up">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(380px,calc(100vw-24px))] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-semibold">Notifications</p>
          {unread > 0 && (
            <button type="button" className="text-[13px] font-semibold text-primary hover:underline" onClick={() => markRead.mutate(null)}>
              Tout marquer comme lu
            </button>
          )}
        </div>
        {!data ? (
          <div className="flex flex-col gap-2 p-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-12 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : data.notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
            <BellOff className="size-5" />
            Aucune notification pour le moment.
          </div>
        ) : (
          <ul className="max-h-[420px] overflow-y-auto p-1.5">
            {data.notifications.map((n) => {
              const Icon = ICONS[n.type] || Bell;
              return (
                <li key={n._id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.lue) markRead.mutate([n._id]);
                      setOpen(false);
                      if (n.lien) navigate(n.lien);
                    }}
                    className={cn('flex w-full gap-3 rounded-md px-2.5 py-2.5 text-left transition-colors hover:bg-accent', !n.lue && 'bg-primary-soft/60')}
                  >
                    <Icon className={cn('mt-0.5 size-4 shrink-0', n.lue ? 'text-muted-foreground' : 'text-primary')} />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-sm leading-snug', !n.lue && 'font-medium')}>{n.contenu}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{relative(n.dateCreation)}</span>
                    </span>
                    {!n.lue && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Non lue" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
