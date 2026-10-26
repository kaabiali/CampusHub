import { cloneElement, useId } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function Field({ label, error, help, className, children, optional }) {
  const id = useId();
  const describedBy = [error && `${id}-err`, help && `${id}-help`].filter(Boolean).join(' ') || undefined;
  // Function children receive the props so composite controls (Radix Select) can put the id on the focusable part.
  const controlProps = { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy };
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <Label htmlFor={id} className="text-foreground-2">
        {label}
        {optional && <span className="font-normal text-muted-foreground">(facultatif)</span>}
      </Label>
      {typeof children === 'function'
        ? children(controlProps)
        : cloneElement(children, controlProps)}
      {error ? (
        <p id={`${id}-err`} className="text-[13px] text-destructive animate-fade-up">
          {error}
        </p>
      ) : (
        help && (
          <p id={`${id}-help`} className="text-[13px] text-muted-foreground">
            {help}
          </p>
        )
      )}
    </div>
  );
}
