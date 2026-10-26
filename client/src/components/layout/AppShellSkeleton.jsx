export function AppShellSkeleton() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]" aria-busy="true" aria-label="Chargement">
      <aside className="hidden h-dvh flex-col gap-6 border-r bg-card px-5 py-5 lg:flex">
        <div className="h-8 w-36 rounded-md bg-muted animate-pulse" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-9 rounded-md bg-muted/70 animate-pulse" />
          ))}
        </div>
      </aside>
      <div className="flex flex-col">
        <div className="h-14 border-b" />
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
