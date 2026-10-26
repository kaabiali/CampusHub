import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CircleCheck, Eye, Flag, MessageCircle, Pencil, RotateCcw, Sparkles, Star, Trash2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { BookCover } from '@/components/books/BookCover';
import { BookFormSheet } from '@/components/books/BookFormSheet';
import { ReportDialog } from '@/components/ReportDialog';
import { UserAvatar } from '@/components/UserAvatar';
import { EmptyState } from '@/components/EmptyState';
import { del, get, post } from '@/lib/api';
import { ETAT_LABELS, priceVerdict } from '@/lib/books';
import { dayLong, fullName, plural, price } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';

function Gallery({ book }) {
  const [index, setIndex] = useState(0);
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg border bg-muted">
        <BookCover book={book} photoIndex={index} className="aspect-[4/3] w-full" />
      </div>
      {book.photos.length > 1 && (
        <div className="flex gap-2" role="tablist" aria-label="Photos">
          {book.photos.map((p, i) => (
            <button
              key={p.url}
              role="tab"
              aria-selected={i === index}
              aria-label={`Photo ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn('size-16 overflow-hidden rounded-md border-2 transition-colors', i === index ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100')}
            >
              <img src={p.url} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Fact({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-t py-2.5 text-sm first:border-t-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" aria-busy="true">
      <div className="aspect-[4/3] rounded-lg bg-muted animate-pulse" />
      <div className="flex flex-col gap-4">
        <div className="h-8 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-10 w-28 rounded bg-muted animate-pulse" />
        <div className="h-40 rounded-lg bg-muted/70 animate-pulse" />
      </div>
    </div>
  );
}

export default function LivreDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reporting, setReporting] = useState(false);

  const { data: book, isPending, error } = useQuery({ queryKey: ['annonce', id], queryFn: () => get(`/annonces/${id}`).then((r) => r.annonce) });

  const setStatus = useMutation({
    mutationFn: (statut) => post(`/annonces/${id}/statut`, { statut }).then((r) => r.annonce),
    onMutate: async (statut) => {
      const previous = queryClient.getQueryData(['annonce', id]);
      queryClient.setQueryData(['annonce', id], { ...previous, statut });
      return { previous };
    },
    onSuccess: (annonce) => {
      queryClient.setQueryData(['annonce', id], annonce);
      queryClient.invalidateQueries({ queryKey: ['annonces'] });
      toast.success(annonce.statut === 'VENDUE' ? 'Annonce marquée comme vendue.' : 'Annonce remise en vente.');
    },
    onError: (err, statut, ctx) => {
      queryClient.setQueryData(['annonce', id], ctx.previous);
      toast.error(err.message);
    },
  });

  const remove = useMutation({
    mutationFn: () => del(`/annonces/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annonces'] });
      queryClient.removeQueries({ queryKey: ['annonce', id] });
      toast.success('Annonce supprimée.');
      navigate('/livres?vue=mes-annonces', { replace: true });
    },
    onError: (err) => toast.error(err.message),
  });

  const back = (
    <Link to="/livres" className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" /> Livres
    </Link>
  );

  if (isPending) return <>{back}<DetailSkeleton /></>;
  if (error) {
    return (
      <>
        {back}
        <EmptyState icon={TriangleAlert} title={error.status === 404 ? 'Annonce introuvable' : 'Impossible de charger l’annonce'} description={error.status === 404 ? 'Elle a peut-être été vendue, supprimée ou retirée par la modération.' : error.message} action={<Button asChild variant="outline"><Link to="/livres">Voir les autres livres</Link></Button>} />
      </>
    );
  }

  const owner = String(book.vendeur._id) === String(user._id);
  const verdict = priceVerdict(book);

  return (
    <>
      {back}
      {owner && book.statut !== 'DISPONIBLE' && (
        <div className={cn('flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm', book.statut === 'MASQUEE' ? 'bg-destructive-soft text-destructive' : 'bg-muted text-foreground-2')} role="status">
          {book.statut === 'MASQUEE' ? <TriangleAlert className="size-4" /> : <CircleCheck className="size-4" />}
          {book.statut === 'MASQUEE' ? 'Cette annonce a été masquée par la modération et n’est plus visible.' : 'Annonce vendue : elle n’apparaît plus dans les résultats.'}
        </div>
      )}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
        <Gallery book={book} />
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-primary">{book.categorie?.nom}</span>
            <h1 className="text-2xl font-semibold sm:text-3xl">{book.titre}</h1>
            {book.auteur && <p className="text-muted-foreground">{book.auteur}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-3xl tabular">{price(book.prix)}</span>
            {verdict && (
              <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold', verdict.tone === 'success' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning')}>
                <Sparkles className="size-3.5" />
                {verdict.label} ({book.prixConseille.min} à {price(book.prixConseille.max)})
              </span>
            )}
          </div>

          {owner ? (
            <div className="flex flex-wrap gap-2">
              {book.statut !== 'MASQUEE' && (
                <>
                  <Button onClick={() => setEditing(true)}>
                    <Pencil /> Modifier
                  </Button>
                  {book.statut === 'DISPONIBLE' ? (
                    <Button variant="outline" onClick={() => setStatus.mutate('VENDUE')} disabled={setStatus.isPending}>
                      <CircleCheck /> Marquer comme vendue
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => setStatus.mutate('DISPONIBLE')} disabled={setStatus.isPending}>
                      <RotateCcw /> Remettre en vente
                    </Button>
                  )}
                </>
              )}
              <Button variant="ghost" className="text-destructive hover:bg-destructive-soft hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 /> Supprimer
              </Button>
            </div>
          ) : (
            book.statut === 'DISPONIBLE' && (
              <Button asChild size="lg" className="self-start">
                <Link to={`/messages/${book.vendeur._id}?sujet=ANNONCE:${book._id}`}>
                  <MessageCircle /> Contacter le vendeur
                </Link>
              </Button>
            )
          )}

          <dl className="rounded-lg border bg-card px-4 py-1.5 shadow-xs">
            <Fact label="Matière" value={book.matiere} />
            <Fact label="État" value={ETAT_LABELS[book.etat]} />
            <Fact label="Année d’édition" value={book.anneeEdition} />
            <Fact label="Prix neuf" value={book.prixNeuf && price(book.prixNeuf)} />
            <Fact label="Publiée le" value={dayLong(book.datePublication)} />
          </dl>

          {book.description && <p className="max-w-[65ch] leading-relaxed whitespace-pre-line text-foreground-2">{book.description}</p>}

          <div className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-xs">
            <UserAvatar user={book.vendeur} className="size-11" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{fullName(book.vendeur)}</p>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {book.vendeur.filiere || 'Étudiant'}
                {book.vendeur.noteMoyenne && (
                  <>
                    {' · '}
                    <Star className="size-3.5 fill-current text-warning" /> {book.vendeur.noteMoyenne.toFixed(1).replace('.', ',')}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            {owner ? (
              <span className="inline-flex items-center gap-1.5">
                <Eye className="size-4" /> {plural(book.vues, 'vue')}
              </span>
            ) : (
              <button type="button" onClick={() => setReporting(true)} className="inline-flex items-center gap-1.5 hover:text-destructive">
                <Flag className="size-4" /> Signaler cette annonce
              </button>
            )}
          </div>
        </div>
      </div>

      <BookFormSheet open={editing} onOpenChange={setEditing} book={book} />
      <ReportDialog open={reporting} onOpenChange={setReporting} typeContenu="ANNONCE" contenuId={book._id} />
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette annonce ?</AlertDialogTitle>
            <AlertDialogDescription>« {book.titre} » et ses photos seront définitivement supprimés.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove.mutate()} className="bg-destructive text-white hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
