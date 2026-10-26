import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { MessagesSquare } from 'lucide-react';
import { ConversationList } from '@/components/messages/ConversationList';
import { Thread } from '@/components/messages/Thread';
import { useConversations } from '@/hooks/useConversations';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';

const CONTEXT_TYPES = ['ANNONCE', 'TRAJET', 'EVENEMENT'];

export default function Messagerie() {
  const { uid } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { data, isPending } = useConversations();

  // ?sujet=ANNONCE:<id> attaches the first message to the listing, ride or event it was started from.
  const sujet = params.get('sujet');
  const contexte = useMemo(() => {
    const [type, ref] = (sujet || '').split(':');
    return CONTEXT_TYPES.includes(type) && /^[a-f0-9]{24}$/.test(ref) ? { type, ref } : null;
  }, [sujet]);

  return (
    <>
      <h1 className="sr-only">Messagerie</h1>
      <div className="-mx-4 -mt-6 -mb-16 grid h-[calc(100dvh-3.5rem)] overflow-hidden border-y bg-card sm:mx-0 sm:mt-0 sm:mb-0 sm:h-[calc(100dvh-8.5rem)] sm:min-h-[480px] sm:rounded-lg sm:border sm:shadow-xs md:grid-cols-[320px_minmax(0,1fr)]">
        <aside className={cn('min-h-0 border-r', uid && 'hidden md:block')}>
          <ConversationList conversations={data} isPending={isPending} />
        </aside>
        <div className={cn('min-h-0', !uid && 'hidden md:flex md:flex-col')}>
          {uid && uid !== String(user._id) ? (
            <Thread key={uid} otherId={uid} contexte={contexte} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-background p-8 text-center">
              <span className="flex size-12 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                <MessagesSquare className="size-6" strokeWidth={1.75} />
              </span>
              <p className="font-semibold">Vos conversations</p>
              <p className="max-w-xs text-sm text-muted-foreground">Choisissez une conversation, ou contactez un vendeur ou un conducteur depuis son annonce.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
