import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TagInput({ id, value, onChange, suggestions = [], placeholder, max = 20, ...aria }) {
  const [draft, setDraft] = useState('');
  const lower = value.map((v) => v.toLowerCase());

  const add = (raw) => {
    const tag = raw.trim().slice(0, 40);
    if (!tag || lower.includes(tag.toLowerCase()) || value.length >= max) return;
    onChange([...value, tag]);
    setDraft('');
  };
  const remove = (tag) => onChange(value.filter((t) => t !== tag));

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      remove(value[value.length - 1]);
    }
  };

  const remaining = suggestions.filter((s) => !lower.includes(s.toLowerCase()));

  return (
    <div className="flex flex-col gap-2.5">
      <div
        className={cn(
          'flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-card px-2 py-1.5 shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
          aria['aria-invalid'] && 'border-destructive',
        )}
      >
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-primary-soft py-0.5 pr-1 pl-2 text-[13px] font-medium text-primary-soft-foreground animate-fade-up">
            {tag}
            <button type="button" onClick={() => remove(tag)} className="rounded-sm p-0.5 hover:bg-primary/15" aria-label={`Retirer ${tag}`}>
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
          placeholder={value.length ? '' : placeholder}
          className="h-6 min-w-32 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          {...aria}
        />
      </div>
      {remaining.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Suggestions">
          {remaining.slice(0, 10).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-input px-2 py-0.5 text-[13px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Plus className="size-3" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
