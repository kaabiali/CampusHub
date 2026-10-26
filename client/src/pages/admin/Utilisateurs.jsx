import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';
import { UserAvatar } from '@/components/UserAvatar';
import { useDebounced } from '@/hooks/useDebounced';
import { del, get, post } from '@/lib/api';
import { dayShort, fullName, plural } from '@/lib/format';

const FILTERS = { tous: 'Tous', bloques: 'Bloqués', 'non-verifies': 'Non vérifiés', admins: 'Administrateurs' };

export default function Utilisateurs() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const debounced = useDebounced(q, 300);
  const statut = params.get('statut') || 'tous';
  const page = Number(params.get('page')) || 1;
  const [confirmDelete, setConfirmDelete] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (debounced === (params.get('q') || '')) return;
    setParams((prev) => {
      const n = new URLSearchParams(prev);
      debounced.trim() ? n.set('q', debounced.trim()) : n.delete('q');
      n.delete('page');
      return n;
    }, { replace: true });
  }, [debounced]);

  const filters = { q: params.get('q') || undefined, statut, page };
  const { data, isPending, isPlaceholderData } = useQuery({ queryKey: ['admin', 'utilisateurs', filters], queryFn: () => get('/admin/utilisateurs', filters), placeholderData: keepPreviousData });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'utilisateurs'] });

  const block = useMutation({
    mutationFn: ({ id, bloque }) => post(`/admin/utilisateurs/${id}/bloquer`, { bloque }),
    onMutate: ({ id, bloque }) => {
      queryClient.setQueryData(['admin', 'utilisateurs', filters], (d) => d && { ...d, utilisateurs: d.utilisateurs.map((u) => (u._id === id ? { ...u, estBloque: bloque } : u)) });
    },
    onSuccess: (r, { bloque }) => toast.success(bloque ? 'Compte bloqué. Ses sessions sont fermées.' : 'Compte débloqué.'),
    onError: (e) => {
      toast.error(e.message);
      refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (id) => del(`/admin/utilisateurs/${id}`),
    onSuccess: () => {
      toast.success('Compte supprimé et anonymisé.');
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Utilisateurs" description={data ? plural(data.total, 'compte') : 'Comptes étudiants et administrateurs'} />
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative w-full sm:w-80">
          <span className="sr-only">Rechercher un utilisateur</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, prénom ou e-mail" className="pl-9" />
        </label>
        <ToggleGroup type="single" value={statut} onValueChange={(v) => v && setParams(v === 'tous' ? {} : { statut: v })} aria-label="Filtrer" className="flex-wrap justify-start gap-1.5">
          {Object.entries(FILTERS).map(([v, l]) => (
            <ToggleGroupItem key={v} value={v} className="h-8 rounded-full border border-input px-3 text-[13px] data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-background">
              {l}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {isPending ? (
        <div className="h-72 rounded-lg bg-muted/70 animate-pulse" />
      ) : data.utilisateurs.length === 0 ? (
        <EmptyState icon={UserX} title="Aucun compte ne correspond" />
      ) : (
        <div className={`overflow-x-auto rounded-lg border bg-card shadow-xs transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}>
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Étudiant</th>
                <th className="px-4 py-3 font-medium">Filière</th>
                <th className="px-4 py-3 font-medium">Inscription</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.utilisateurs.map((u) => (
                <tr key={u._id} className="border-t first:border-t-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={u} className="size-8" tone="muted" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{fullName(u)}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-foreground-2">{[u.filiere, u.niveau].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-4 py-2.5 text-foreground-2 first-letter:uppercase">{dayShort(u.dateInscription)}</td>
                  <td className="px-4 py-2.5">
                    {u.role === 'ADMIN' ? (
                      <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-soft-foreground">Admin</span>
                    ) : u.estBloque ? (
                      <span className="rounded-md bg-destructive-soft px-2 py-0.5 text-xs font-semibold text-destructive">Bloqué</span>
                    ) : !u.emailVerifie ? (
                      <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">Non vérifié</span>
                    ) : (
                      <span className="rounded-md bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">Actif</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {u.role !== 'ADMIN' && (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" disabled={block.isPending} onClick={() => block.mutate({ id: u._id, bloque: !u.estBloque })}>
                          {u.estBloque ? 'Débloquer' : 'Bloquer'}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive-soft hover:text-destructive" onClick={() => setConfirmDelete(u)}>
                          Supprimer
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={(p) => setParams((prev) => { const n = new URLSearchParams(prev); n.set('page', p); return n; })} />}
      <AlertDialog open={Boolean(confirmDelete)} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le compte de {confirmDelete && fullName(confirmDelete)} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les données personnelles sont anonymisées, les annonces masquées, les trajets à venir annulés (passagers prévenus) et l’animation de ses groupes transmise au membre le plus ancien. Action définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => remove.mutate(confirmDelete._id)}>
              Supprimer le compte
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
