import { Link } from 'react-router';
import { cn } from '@/lib/utils';

export function BrandMark({ className }) {
  return (
    <span className={cn('flex size-8 items-center justify-center rounded-lg bg-primary text-[17px] font-bold text-primary-foreground shadow-xs', className)} aria-hidden="true">
      C
    </span>
  );
}

export function Brand({ to = '/', className, inverted }) {
  return (
    <Link to={to} className={cn('flex items-center gap-2.5 rounded-md text-lg font-bold tracking-tight', inverted ? 'text-white' : 'text-foreground', className)}>
      <BrandMark className={inverted ? 'bg-white text-[#2547d0]' : undefined} />
      CampusHub
    </Link>
  );
}
