function collapsed() {
  try {
    return localStorage.getItem('campushub-sidebar') === 'collapsed';
  } catch {
    return false;
  }
}

export function AppShellSkeleton() {
  return (
    <div className="flex min-h-dvh bg-background" aria-busy="true" aria-label="Chargement">
      <aside className="hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex" style={{ width: collapsed() ? 72 : 248 }}>
        <div className="flex h-14 items-center border-b border-sidebar-border px-3">
          <div className="h-8 w-32 max-w-full rounded-md bg-muted animate-pulse" />
        </div>
        <div className="flex flex-col gap-2 p-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-9 rounded-lg bg-muted/70 animate-pulse" />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-14 border-b-2 border-b-primary/25" />
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 pt-8 sm:px-6 lg:px-10">
          <div className="h-8 w-64 rounded-md bg-muted animate-pulse" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-28 rounded-lg bg-muted/70 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
