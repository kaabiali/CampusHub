import { CircleAlert } from 'lucide-react';

export function FormError({ error }) {
  if (!error || (error.code === 'VALIDATION' && Object.keys(error.champs || {}).length)) return null;
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2.5 text-sm text-destructive animate-fade-up">
      <CircleAlert className="mt-0.5 size-4 shrink-0" />
      <span>{error.message}</span>
    </div>
  );
}
