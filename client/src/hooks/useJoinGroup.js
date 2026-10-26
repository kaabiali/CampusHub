import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { post } from '@/lib/api';

const markJoined = (id) => (g) => (String(g._id) === String(id) ? { ...g, estMembre: true, nbMembres: g.nbMembres + 1 } : g);

export function useJoinGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => post(`/groupes/${id}/membres`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['groupes'] });
      const snapshot = queryClient.getQueriesData({ queryKey: ['groupes'] });
      queryClient.setQueriesData({ queryKey: ['groupes'] }, (data) => (data?.groupes ? { ...data, groupes: data.groupes.map(markJoined(id)) } : data));
      return { snapshot };
    },
    onError: (err, id, ctx) => {
      for (const [key, data] of ctx.snapshot) queryClient.setQueryData(key, data);
      toast.error(err.message);
    },
    onSuccess: () => toast.success('Vous avez rejoint le groupe.'),
    onSettled: (data, err, id) => {
      queryClient.invalidateQueries({ queryKey: ['groupes'] });
      queryClient.invalidateQueries({ queryKey: ['groupe', id] });
    },
  });
}
