import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const LABELS = ['Très mauvais', 'Mauvais', 'Correct', 'Bien', 'Excellent'];

export function StarRating({ value, onChange, size = 'md' }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Note" onMouseLeave={() => setHover(0)}>
      {LABELS.map((label, i) => {
        const n = i + 1;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} sur 5 : ${label}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(Math.min(5, (value || 0) + 1));
              if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(Math.max(1, (value || 1) - 1));
            }}
            tabIndex={value === n || (!value && n === 1) ? 0 : -1}
            className="rounded-sm p-0.5 transition-transform duration-100 hover:scale-110 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Star className={cn(size === 'sm' ? 'size-5' : 'size-7', n <= shown ? 'fill-warning text-warning' : 'text-input')} strokeWidth={1.5} />
          </button>
        );
      })}
      {shown > 0 && <span className="ml-2 text-sm text-muted-foreground">{LABELS[shown - 1]}</span>}
    </div>
  );
}

export function RatingBadge({ user, className }) {
  if (!user?.noteMoyenne) return <span className={cn('text-muted-foreground', className)}>Nouveau conducteur</span>;
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <Star className="size-3.5 fill-warning text-warning" />
      {user.noteMoyenne.toFixed(1).replace('.', ',')}
      <span className="text-muted-foreground">({user.nbAvis})</span>
    </span>
  );
}
