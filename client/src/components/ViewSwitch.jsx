import { Link } from 'react-router';
import { cn } from '@/lib/utils';

// Switches between URL-addressable views of the same page. These are links, not ARIA tabs:
// each option is its own address, and there is no in-page tab panel to point at.
export function ViewSwitch({ label, options, value }) {
  return (
    <nav aria-label={label} className="inline-flex w-fit items-center gap-1 rounded-lg bg-muted p-[3px]">
      {options.map((o) => (
        <Link
          key={o.value}
          to={o.to}
          replace
          aria-current={o.value === value ? 'page' : undefined}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium text-muted-foreground transition-[color,background-color,box-shadow] duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring',
            o.value === value && 'bg-background text-foreground shadow-xs dark:bg-input/30',
          )}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
