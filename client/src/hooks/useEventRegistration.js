import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { del, post } from '@/lib/api';

const apply = (id, register) => (e) => (String(e._id) === String(id) ? { ...e, estInscrit: register, nbInscrits: e.nbInscrits + (register ? 1 : -1) } : e);

// Optimistic register/unregister across event lists and the detail view.
export function useEventRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, register }) => (register ? post(`/evenements/${id}/inscription`) : del(`/evenements/${id}/inscription`)),
    onMutate: async ({ id, register }) => {
      await queryClient.cancelQueries({ queryKey: ['evenements'] });
      const lists = queryClient.getQueriesData({ queryKey: ['evenements'] });
      const detail = queryClient.getQueryData(['evenement', id]);
      queryClient.setQueriesData({ queryKey: ['evenements'] }, (d) => (d?.evenements ? { ...d, evenements: d.evenements.map(apply(id, register)) } : d));
      if (detail) queryClient.setQueryData(['evenement', id], apply(id, register)(detail));
      return { lists, detail, id };
    },
    onError: (err, vars, ctx) => {
      for (const [key, data] of ctx.lists) queryClient.setQueryData(key, data);
      if (ctx.detail) queryClient.setQueryData(['evenement', ctx.id], ctx.detail);
      toast.error(err.message);
    },
    onSuccess: (data, { register }) => toast.success(register ? 'Inscription confirmée. Un rappel vous sera envoyé la veille.' : 'Inscription annulée.'),
    onSettled: (data, err, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['evenements'] });
      queryClient.invalidateQueries({ queryKey: ['evenement', id] });
    },
  });
}
