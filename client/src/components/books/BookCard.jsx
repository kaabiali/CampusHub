import { Link } from 'react-router';
import { BookCover } from './BookCover';
import { ETAT_LABELS } from '@/lib/books';
import { price, shortName } from '@/lib/format';

const STATUS = {
  VENDUE: { label: 'Vendue', className: 'bg-muted text-foreground-2' },
  MASQUEE: { label: 'Masquée par la modération', className: 'bg-destructive-soft text-destructive' },
};

export function BookCard({ book, showStatus }) {
  const status = showStatus && STATUS[book.statut];
  return (
    <Link
      to={`/livres/${book._id}`}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card shadow-xs transition-[transform,box-shadow,border-color] duration-150 ease-out hover:-translate-y-0.5 hover:border-input hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="relative">
        <BookCover book={book} className="aspect-[4/3] w-full" />
        {status && <span className={`absolute top-2 left-2 rounded-md px-2 py-0.5 text-xs font-semibold shadow-xs ${status.className}`}>{status.label}</span>}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold tracking-normal">{book.titre}</h3>
        <p className="text-[13px] text-muted-foreground">
          {book.matiere} · {ETAT_LABELS[book.etat]}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
          <span className="font-mono text-[17px] tabular">{price(book.prix)}</span>
          <span className="truncate text-xs text-muted-foreground">{shortName(book.vendeur)}</span>
        </div>
      </div>
    </Link>
  );
}

export function BookCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-card" aria-hidden="true">
      <div className="aspect-[4/3] w-full bg-muted animate-pulse" />
      <div className="flex flex-col gap-2 p-4">
        <div className="h-4 w-4/5 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-muted/70 animate-pulse" />
        <div className="mt-3 h-5 w-16 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}
