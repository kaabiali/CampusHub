import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { post } from '@/lib/api';
import { useAuth } from './AuthProvider';

const SocketContext = createContext(null);
const TYPING_TIMEOUT = 4000;

const otherParty = (message, me) => String(String(message.expediteur) === String(me) ? message.destinataire : message.expediteur);

// Inserts a server message into a cached thread, replacing its optimistic copy (same clientId) if present.
export function mergeMessage(thread, message) {
  if (!thread) return thread;
  const messages = thread.messages.filter((m) => m._id !== message._id && m.clientId !== message.clientId);
  return { ...thread, messages: [...messages, message].sort((a, b) => new Date(a.dateEnvoi) - new Date(b.dateEnvoi)) };
}

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState({});
  const activeThread = useRef(null);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const setActiveThread = useCallback((uid) => {
    activeThread.current = uid ? String(uid) : null;
  }, []);

  useEffect(() => {
    if (!user?.emailVerifie) return undefined;
    const me = String(user._id);
    const s = io({ withCredentials: true, transports: ['websocket', 'polling'] });
    const timers = {};
    let wasDisconnected = false;

    s.on('connect', () => {
      setConnected(true);
      // Anything that happened while offline is refetched rather than replayed.
      if (wasDisconnected) {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.invalidateQueries({ queryKey: ['thread'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    });
    s.on('disconnect', () => {
      wasDisconnected = true;
      setConnected(false);
    });

    s.on('message:new', (message) => {
      const other = otherParty(message, me);
      queryClient.setQueryData(['thread', other], (t) => mergeMessage(t, message));
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      const incoming = String(message.expediteur) !== me;
      if (!incoming) return;
      setTyping((t) => ({ ...t, [other]: false }));
      if (activeThread.current === other && document.visibilityState === 'visible') {
        post(`/conversations/${other}/lu`).then(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }));
      } else if (!pathRef.current.startsWith('/messages')) {
        toast(`Message de ${message.auteur?.prenom ?? 'un étudiant'}`, {
          description: message.contenu.slice(0, 120),
          action: { label: 'Répondre', onClick: () => navigate(`/messages/${other}`) },
        });
      }
    });

    s.on('messages:lus', ({ par }) => {
      queryClient.setQueryData(['thread', String(par)], (t) =>
        t ? { ...t, messages: t.messages.map((m) => (String(m.expediteur) === me ? { ...m, lu: true } : m)) } : t,
      );
    });

    s.on('notification:new', (n) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (n.type === 'RESERVATION') {
        for (const key of ['trajets', 'trajet', 'mes-trajets']) queryClient.invalidateQueries({ queryKey: [key] });
      }
      if (n.type !== 'MESSAGE') {
        toast(n.contenu, n.lien ? { action: { label: 'Voir', onClick: () => navigate(n.lien) } } : undefined);
      }
    });
    s.on('notifications:lues', () => queryClient.invalidateQueries({ queryKey: ['notifications'] }));

    s.on('typing', ({ de, actif }) => {
      clearTimeout(timers[de]);
      setTyping((t) => ({ ...t, [de]: actif }));
      if (actif) timers[de] = setTimeout(() => setTyping((t) => ({ ...t, [de]: false })), TYPING_TIMEOUT);
    });

    setSocket(s);
    return () => {
      Object.values(timers).forEach(clearTimeout);
      s.close();
      setSocket(null);
      setConnected(false);
    };
  }, [user?._id, user?.emailVerifie, queryClient, navigate]);

  return <SocketContext.Provider value={{ socket, connected, typing, setActiveThread }}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
