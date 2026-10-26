import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

function pageList(page, pages) {
  const set = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i && p - sorted[i - 1] > 1 ? ['…', p] : [p]));
}

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      <Button variant="ghost" size="icon-sm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Page précédente">
        <ChevronLeft />
      </Button>
      {pageList(page, pages).map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-1 text-muted-foreground">
            …
          </span>
        ) : (
          <Button key={p} variant={p === page ? 'outline' : 'ghost'} size="icon-sm" onClick={() => onChange(p)} aria-current={p === page ? 'page' : undefined} className="tabular">
            {p}
          </Button>
        ),
      )}
      <Button variant="ghost" size="icon-sm" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Page suivante">
        <ChevronRight />
      </Button>
    </nav>
  );
}
