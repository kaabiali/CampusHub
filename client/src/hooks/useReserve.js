import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { post } from '@/lib/api';

const patchRide = (rideId, fn) => (ride) => (ride && String(ride._id) === String(rideId) ? fn(ride) : ride);

// Optimistically books seats across every cached list and detail view, rolling back on refusal.
export function useReserve() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rideId, nbPlaces = 1 }) => post(`/trajets/${rideId}/reservations`, { nbPlaces }),
    onMutate: async ({ rideId, nbPlaces = 1 }) => {
      await queryClient.cancelQueries({ queryKey: ['trajets'] });
      const snapshot = queryClient.getQueriesData({ queryKey: ['trajets'] });
      const detail = queryClient.getQueryData(['trajet', rideId]);
      const book = (r) => ({
        ...r,
        placesDisponibles: r.placesDisponibles - nbPlaces,
        statut: r.placesDisponibles - nbPlaces <= 0 ? 'COMPLET' : r.statut,
        maReservation: { _id: 'optimiste', nbPlaces },
      });
      queryClient.setQueriesData({ queryKey: ['trajets'] }, (data) => (data ? { ...data, trajets: data.trajets.map(patchRide(rideId, book)) } : data));
      if (detail) queryClient.setQueryData(['trajet', rideId], book(detail));
      return { snapshot, detail, rideId };
    },
    onError: (err, vars, ctx) => {
      for (const [key, data] of ctx.snapshot) queryClient.setQueryData(key, data);
      if (ctx.detail) queryClient.setQueryData(['trajet', ctx.rideId], ctx.detail);
      toast.error(err.message);
    },
    onSuccess: () => toast.success('Place réservée. Le conducteur est prévenu.'),
    onSettled: (data, err, { rideId }) => {
      queryClient.invalidateQueries({ queryKey: ['trajets'] });
      queryClient.invalidateQueries({ queryKey: ['trajet', rideId] });
      queryClient.invalidateQueries({ queryKey: ['mes-trajets'] });
    },
  });
}
