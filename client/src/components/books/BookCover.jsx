import { coverColor, coverLabel } from '@/lib/books';
import { cn } from '@/lib/utils';

export function BookCover({ book, className, photoIndex = 0, size = 'md' }) {
  const photo = book.photos?.[photoIndex];
  if (photo) {
    return <img src={photo.url} alt={`Photo de « ${book.titre} »`} loading="lazy" className={cn('object-cover', className)} />;
  }
  return (
    <div
      className={cn('flex items-end font-bold leading-tight text-white', size === 'sm' ? 'p-2 text-[10px]' : 'p-4 text-[13px]', className)}
      style={{ background: coverColor(book.titre) }}
      aria-hidden="true"
    >
      <span className="max-w-[14ch]">{coverLabel(book)}</span>
    </div>
  );
}
