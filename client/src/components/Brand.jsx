import { Link } from 'react-router';
import { cn } from '@/lib/utils';

export function BrandMark({ className, ring = 'var(--primary)', cap = 'var(--foreground)' }) {
  return (
    <svg viewBox="0 0 512 512" fill="none" strokeLinejoin="round" className={cn('size-9 shrink-0', className)} aria-hidden="true">
      <g stroke={ring} strokeWidth="24" strokeLinecap="round">
        <path d="M422 400.3A220 220 0 0 1 48 184.4" />
        <path d="M67.4 142.7A220 220 0 0 1 448.4 362.7" />
      </g>
      <g stroke={cap}>
        <path d="M81 218 256.6 135 419 214.5 245.5 300Z" strokeWidth="28" />
        <path d="M250 216 352 249" strokeWidth="26" />
        <path d="M149 268v30c0 8 4 14 12 18l84.5 38 85-38c8-4 12-10 12-18v-30" strokeWidth="26" />
        <path d="M381 236v80" strokeWidth="12" />
        <circle cx="381" cy="334" r="22" fill={cap} stroke="none" />
      </g>
    </svg>
  );
}

export function Brand({ to = '/', className, inverted }) {
  return (
    <Link to={to} className={cn('flex items-center gap-2.5 rounded-md text-xl tracking-[-0.02em]', inverted ? 'text-white' : 'text-foreground', className)}>
      <BrandMark {...(inverted && { ring: 'var(--mint)', cap: '#fff' })} />
      <span>
        <b className="font-bold">Campus</b>
        <span className="font-normal">Hub</span>
      </span>
    </Link>
  );
}
