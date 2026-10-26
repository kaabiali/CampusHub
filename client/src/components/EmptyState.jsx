import { cn } from '@/lib/utils';

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-lg border border-dashed border-input px-6 py-12 text-center', className)}>
      {Icon && (
        <span className="flex size-11 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
          <Icon className="size-5" strokeWidth={1.75} />
        </span>
      )}
      <div className="flex max-w-sm flex-col gap-1">
        <p className="font-semibold">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
