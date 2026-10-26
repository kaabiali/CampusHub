import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { post } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { mergeMessage, useSocket } from '@/providers/SocketProvider';

const ACK_TIMEOUT = 8000;

export function useSendMessage(otherId, contexte) {
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const queryClient = useQueryClient();

  const setStatus = useCallback(
    (clientId, statut) =>
      queryClient.setQueryData(['thread', otherId], (t) => (t ? { ...t, messages: t.messages.map((m) => (m.clientId === clientId && m.statut ? { ...m, statut } : m)) } : t)),
    [queryClient, otherId],
  );

  const deliver = useCallback(
    async (clientId, contenu) => {
      setStatus(clientId, 'envoi');
      const payload = { destinataire: otherId, contenu, clientId, contexte };
      try {
        let message;
        if (socket && connected) {
          const ack = await socket.timeout(ACK_TIMEOUT).emitWithAck('message:send', payload);
          if (!ack.ok) throw new Error(ack.error?.message);
          message = ack.message;
        } else {
          // Same clientId as the socket path, so a later retry can never create a duplicate.
          message = (await post(`/conversations/${otherId}/messages`, payload)).message;
        }
        queryClient.setQueryData(['thread', otherId], (t) => mergeMessage(t, message));
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      } catch {
        setStatus(clientId, 'echec');
      }
    },
    [socket, connected, otherId, contexte, queryClient, setStatus],
  );

  const send = useCallback(
    (contenu) => {
      const clientId = crypto.randomUUID();
      const optimistic = { _id: clientId, clientId, contenu, expediteur: user._id, destinataire: otherId, dateEnvoi: new Date().toISOString(), lu: false, statut: 'envoi' };
      queryClient.setQueryData(['thread', otherId], (t) => (t ? { ...t, messages: [...t.messages, optimistic] } : t));
      deliver(clientId, contenu);
    },
    [deliver, queryClient, otherId, user._id],
  );

  return { send, retry: (m) => deliver(m.clientId, m.contenu) };
}
