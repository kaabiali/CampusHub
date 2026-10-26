import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';

export function useConversations() {
  return useQuery({ queryKey: ['conversations'], queryFn: () => get('/conversations').then((r) => r.conversations), staleTime: 30_000 });
}

export function useUnreadMessages() {
  const { data } = useConversations();
  return data?.reduce((sum, c) => sum + c.nonLus, 0) ?? 0;
}
