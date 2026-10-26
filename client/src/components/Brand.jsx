import { Link } from 'react-router';
import { cn } from '@/lib/utils';

export function BrandMark({ className, color = 'var(--primary)' }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('size-8 shrink-0', className)} aria-hidden="true">
      <path d="M20 6 36 14 20 22 4 14Z" fill={color} />
      <path d="M4 20l16 8 16-8M4 26l16 8 16-8" fill="none" stroke={color} strokeWidth="3.2" strokeLinejoin="round" />
    </svg>
  );
}

export function Brand({ to = '/', className, inverted }) {
  return (
    <Link to={to} className={cn('flex items-center gap-2.5 rounded-md text-xl tracking-[-0.02em]', inverted ? 'text-white' : 'text-foreground', className)}>
      <BrandMark color={inverted ? 'var(--mint)' : undefined} />
      <span>
        <b className="font-bold">Campus</b>
        <span className="font-normal">Hub</span>
      </span>
    </Link>
  );
}
