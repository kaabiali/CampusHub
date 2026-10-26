import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ViewSwitch } from '@/components/ViewSwitch';
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
import { get, post } from '@/lib/api';
import { fullName, relative, shortName } from '@/lib/format';

const TYPES = { ANNONCE: 'Annonce', TRAJET: 'Trajet', EVENEMENT: 'Événement', MESSAGE: 'Message' };
const EFFECT = {
  ANNONCE: 'L’annonce sera masquée pour tous les étudiants.',
  TRAJET: 'Le trajet sera annulé et ses passagers prévenus.',
  EVENEMENT: 'L’événement sera annulé et ses inscrits prévenus.',
  MESSAGE: 'Le message sera remplacé par « [Message retiré par la modération] ».',
};

export default function Moderation() {
  const [params, setParams] = useSearchParams();
  const statut = params.get('statut') === 'TRAITES' ? 'TRAITES' : 'EN_ATTENTE';
  const page = Number(params.get('page')) || 1;
  const [confirm, setConfirm] = useState(null);
  const queryClient = useQueryClient();
  const { data, isPending, isPlaceholderData } = useQuery({ queryKey: ['admin', 'signalements', statut, page], queryFn: () => get('/admin/signalements', { statut, page }), placeholderData: keepPreviousData });

  const act = useMutation({
    mutationFn: ({ id, action }) => post(`/admin/signalements/${id}/${action}`),
    onSuccess: (r, { action }) => {
      toast.success(action === 'traiter' ? 'Contenu retiré. Les signalements liés sont clos.' : 'Signalement rejeté.');
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Modération" description="Contenus signalés par les étudiants. Les plus anciens en premier." />
      <ViewSwitch
        label="Signalements affichés"
        value={statut}
        options={[
          { value: 'EN_ATTENTE', label: 'En attente', to: '/admin/moderation' },
          { value: 'TRAITES', label: 'Traités', to: '/admin/moderation?statut=TRAITES' },
        ]}
      />
      {isPending ? (
        <div className="h-64 rounded-lg bg-muted/70 animate-pulse" />
      ) : data.signalements.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={statut === 'EN_ATTENTE' ? 'Aucun signalement en attente' : 'Aucun signalement traité'} description={statut === 'EN_ATTENTE' ? 'Les nouveaux signalements apparaîtront ici.' : undefined} />
      ) : (
        <div className={`overflow-x-auto rounded-lg border bg-card shadow-xs transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}>
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Contenu</th>
                <th className="px-4 py-3 font-medium">Motif</th>
                <th className="px-4 py-3 font-medium">Signalé par</th>
                <th className="px-4 py-3 text-right font-medium">{statut === 'EN_ATTENTE' ? 'Action' : 'Décision'}</th>
              </tr>
            </thead>
            <tbody>
              {data.signalements.map((r) => (
                <tr key={r._id} className="border-t align-top first:border-t-0">
                  <td className="max-w-xs px-4 py-3">
                    <span className="mb-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-foreground-2">{TYPES[r.typeContenu]}</span>
                    {r.contenu ? (
                      <>
                        <p className="font-semibold">
                          {r.contenu.lien ? (
                            <Link to={r.contenu.lien} target="_blank" className="inline-flex items-center gap-1 hover:underline">
                              {r.contenu.titre} <ExternalLink className="size-3 text-muted-foreground" />
                            </Link>
                          ) : (
                            <span className="italic">« {r.contenu.titre} »</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">par {fullName(r.contenu.auteur)}</p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">Contenu supprimé</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-foreground-2">{r.motif}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-foreground-2">
                    {shortName(r.signalePar)}
                    <span className="block text-xs text-muted-foreground">{relative(r.dateSignalement)}</span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {statut === 'EN_ATTENTE' ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => act.mutate({ id: r._id, action: 'rejeter' })}>
                          Rejeter
                        </Button>
                        <Button size="sm" variant="destructive" disabled={act.isPending || !r.contenu} onClick={() => setConfirm(r)}>
                          Retirer le contenu
                        </Button>
                      </div>
                    ) : (
                      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${r.statut === 'TRAITE' ? 'bg-destructive-soft text-destructive' : 'bg-muted text-foreground-2'}`}>
                        {r.statut === 'TRAITE' ? 'Contenu retiré' : 'Rejeté'}
                        {r.traitePar && <span className="font-normal"> · {shortName(r.traitePar)}</span>}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={(p) => setParams((prev) => { const n = new URLSearchParams(prev); n.set('page', p); return n; })} />}
      <AlertDialog open={Boolean(confirm)} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce contenu ?</AlertDialogTitle>
            <AlertDialogDescription>{confirm && `${EFFECT[confirm.typeContenu]} Tous les signalements sur ce contenu seront clos.`}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => act.mutate({ id: confirm._id, action: 'traiter' })}>
              Retirer le contenu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
