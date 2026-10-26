import { createContext, useCallback, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';

const AuthContext = createContext(null);

const fetchMe = async () => (await get('/auth/moi')).utilisateur;

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const { data: user, isPending, error, refetch } = useQuery({ queryKey: ['moi'], queryFn: fetchMe, staleTime: 5 * 60_000 });

  const setUser = useCallback((u) => queryClient.setQueryData(['moi'], u), [queryClient]);

  // A full reload (rather than clearing state and navigating) avoids the route guard racing the
  // navigation and drops every cached query and live connection from the previous session.
  const logout = useCallback(async (to = '/connexion') => {
    await post('/auth/deconnexion').catch(() => {});
    window.location.assign(to);
  }, []);

  return <AuthContext.Provider value={{ user: user ?? null, isLoading: isPending, error, refetch, setUser, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
