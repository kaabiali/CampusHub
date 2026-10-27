# CampusHub Component Patterns

Copy these recipes only after checking the live component they mirror. They are extracted from the current app, not a parallel design system.

## App Shell

```jsx
<div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
  <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow-md">
    Aller au contenu
  </a>

  <aside className="sticky top-0 hidden h-dvh border-r bg-card lg:block">
    <SidebarContent />
  </aside>

  <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
    <SheetContent side="left" className="w-[280px] p-0">
      <SheetTitle className="sr-only">Menu</SheetTitle>
      <SheetDescription className="sr-only">Navigation principale</SheetDescription>
      <SidebarContent onNavigate={() => setMobileOpen(false)} />
    </SheetContent>
  </Sheet>

  <div className="flex min-w-0 flex-col">
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur-md sm:px-6 lg:px-10">
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Ouvrir le menu">
        <Menu />
      </Button>
      {/* Ctrl+K search trigger */}
      {/* NotificationBell */}
    </header>

    <main id="contenu" key={pathname.split('/')[1]} className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 animate-fade-up px-4 pt-6 pb-16 sm:px-6 lg:px-10 lg:pt-8">
      <Outlet />
    </main>
  </div>
</div>
```

Nav item:

```jsx
<NavLink
  className={({ isActive }) =>
    cn(
      'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-foreground-2 transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring',
      isActive && 'bg-primary-soft font-semibold text-primary-soft-foreground hover:bg-primary-soft hover:text-primary-soft-foreground',
    )
  }
>
  <item.icon className="size-[18px]" strokeWidth={1.75} />
  <span className="flex-1">{item.label}</span>
  {badge > 0 && <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular">{badge > 99 ? '99+' : badge}</span>}
</NavLink>
```

## Page Scaffold

```jsx
<PageHeader title="Groupes d’étude" description="Révisez à plusieurs, par matière.">
  <Button onClick={() => setCreating(true)}>
    <Plus /> Créer un groupe
  </Button>
</PageHeader>

<section className="flex flex-col gap-3" aria-labelledby="explorer">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <h2 id="explorer" className="font-semibold">
      Explorer
      <span className="ml-2 text-sm font-normal text-muted-foreground">{plural(total, 'groupe')}</span>
    </h2>
    <label className="relative w-full sm:w-72">
      <span className="sr-only">Rechercher un groupe</span>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input type="search" className="pl-9" placeholder="Matière, nom du groupe" />
    </label>
  </div>
  {content}
</section>
```

`PageHeader` itself:

```jsx
<header className="flex flex-wrap items-end justify-between gap-4">
  <div className="min-w-0">
    <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
    <p className="mt-1 max-w-[65ch] text-sm text-muted-foreground">{description}</p>
  </div>
  <div className="flex flex-wrap items-center gap-2">{children}</div>
</header>
```

## Filter Bar

```jsx
<section aria-label="Filtres" className="grid gap-3 rounded-lg border bg-card p-4 shadow-xs md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_120px_minmax(0,1fr)]">
  <label className="relative">
    <span className="sr-only">Rechercher</span>
    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
    <Input type="search" className="pl-9" placeholder="Titre, auteur, matière" />
  </label>
  <Select aria-label="Catégorie">…</Select>
  <Input inputMode="decimal" aria-label="Prix maximum en dinars" placeholder="Prix max" />
  <Select aria-label="Trier par">…</Select>
  <ToggleGroup type="multiple" aria-label="État du livre" className="flex flex-wrap justify-start gap-1.5 md:col-span-4">
    <ToggleGroupItem className="h-8 rounded-full border border-input px-3 text-[13px] data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-background">
      Bon
    </ToggleGroupItem>
  </ToggleGroup>
</section>
```

Result count:

```jsx
<div className="flex min-h-5 items-center justify-between text-sm text-muted-foreground" aria-live="polite">
  <span>{plural(total, 'annonce')}</span>
  {hasFilters && <button type="button" className="font-medium text-primary hover:underline">Effacer les filtres</button>}
</div>
```

Filter behavior:

- Store filters in `useSearchParams`; omit empty/default values.
- Debounce text 300 ms; reset `page` on filter change; keep it when paginating.
- Use `replace: true` for typing and view switches.
- Use `keepPreviousData` and reduce opacity while refreshing; keep skeletons for first load only.

## Cards

Standard card:

```jsx
<article className="flex flex-col gap-3 rounded-lg border bg-card p-5 shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-input hover:shadow-sm">
  <div className="flex items-start justify-between gap-3">
    <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-soft-foreground">{group.matiere}</span>
    {group.estMembre && (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
        <Check className="size-3.5" /> Membre
      </span>
    )}
  </div>
  <Link className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
    <h3 className="text-base leading-snug font-semibold tracking-normal hover:underline">{group.nom}</h3>
  </Link>
  <p className="line-clamp-2 text-sm text-muted-foreground">{group.description}</p>
  <CapacityBar value={group.nbMembres} max={group.capaciteMax} />
  <div className="mt-auto flex items-center justify-between gap-3 border-t pt-3 text-[13px] text-foreground-2">…</div>
</article>
```

Capacity bar:

```jsx
<div className="flex items-center gap-2.5">
  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
    <div className={`h-full rounded-full ${ratio >= 1 ? 'bg-warning' : 'bg-primary'}`} style={{ width: `${ratio * 100}%` }} />
  </div>
  <span className="text-xs text-muted-foreground tabular">{value}/{max} membres</span>
</div>
```

Stat card:

```jsx
<Link className="group flex flex-col gap-1.5 rounded-lg border bg-card px-5 py-4 shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-input hover:shadow-sm">
  <span className="text-[13px] text-muted-foreground">{label}</span>
  <span className="text-[28px] leading-none font-semibold tracking-tight tabular">{value}</span>
  <span className="truncate text-[13px] text-foreground-2 first-letter:uppercase">{hint}</span>
</Link>
```

## Detail Page

```jsx
<Link to="/groupes" className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground hover:text-foreground">
  <ArrowLeft className="size-4" /> Groupes
</Link>

<header className="flex flex-col gap-5 rounded-lg border bg-card p-5 shadow-xs sm:p-6 lg:flex-row lg:items-start lg:justify-between">
  <div className="flex max-w-2xl flex-col gap-2">
    <span className="self-start rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-soft-foreground">{group.matiere}</span>
    <h1 className="text-2xl font-semibold">{group.nom}</h1>
    <p className="text-sm text-muted-foreground">Animé par {group.estCreateur ? 'vous' : fullName(creator)}</p>
    <p className="mt-1 leading-relaxed text-foreground-2">{group.description}</p>
  </div>
  <div className="flex w-full flex-col gap-3 lg:w-64">
    <CapacityBar value={group.nbMembres} max={group.capaciteMax} />
    {/* primary / owner / member action */}
  </div>
</header>

<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
  <div className="flex flex-col gap-6">{/* chat, sessions, documents */}</div>
  <aside className="flex flex-col gap-4">{/* meeting, members */}</aside>
</div>
```

Owner actions:

```jsx
<div className="flex gap-2">
  <Button variant="outline" className="flex-1"><Pencil /> Modifier</Button>
  <Button
    variant="ghost"
    size="icon"
    className="text-destructive hover:bg-destructive-soft hover:text-destructive"
    aria-label="Supprimer le groupe"
  >
    <Trash2 />
  </Button>
</div>
```

Side panel:

```jsx
<section className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-xs" aria-labelledby="membres">
  <h2 id="membres" className="font-semibold">Membres <span className="font-normal text-muted-foreground">({group.nbMembres})</span></h2>
  <ul className="flex flex-col gap-1">…</ul>
</section>
```

## Member-Only States

Never render the resource; render the reason and the path to access it.

```jsx
if (!estMembre) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-xs" aria-labelledby="messagerie">
      <h2 id="messagerie" className="font-semibold">Messagerie du groupe</h2>
      <p className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
        <Lock className="size-4" /> Rejoignez le groupe pour lire et écrire dans la discussion.
      </p>
    </section>
  );
}
```

For documents, keep the count if the API provides it:

```jsx
<p className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
  <Lock className="size-4" />
  {group.nbDocuments ? `${group.nbDocuments} document${group.nbDocuments > 1 ? 's' : ''} réservé${group.nbDocuments > 1 ? 's' : ''} aux membres.` : 'Les documents sont réservés aux membres.'}
</p>
```

Meeting links, Jitsi URLs, messages and PDF URLs are never sent to non-members by the API and never prefetched in the client.

## Group Chat

Structure:

```jsx
<section className="flex flex-col overflow-hidden rounded-lg border bg-card shadow-xs" aria-labelledby="messagerie">
  <div className="flex items-center gap-2.5 border-b px-4 py-3">
    <span className="flex size-8 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
      <MessageSquareText className="size-4" />
    </span>
    <div className="min-w-0 flex-1">
      <h2 id="messagerie" className="font-semibold">Messagerie du groupe</h2>
      <p className="text-xs text-muted-foreground">Visible uniquement par les membres.</p>
    </div>
  </div>

  <div aria-live="polite" className="flex min-h-[240px] max-h-[420px] flex-1 flex-col gap-1 overflow-y-auto bg-background px-3 py-4 sm:px-4">
    {/* “Messages précédents”, empty, skeleton or messages */}
  </div>

  <form className="flex items-end gap-2 border-t bg-card p-3">
    <label className="sr-only" htmlFor={chatId}>Votre message au groupe</label>
    <textarea
      id={chatId}
      rows={1}
      maxLength={2000}
      placeholder="Écrire au groupe"
      className="max-h-[140px] min-h-10 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
    />
    <Button type="submit" size="icon" className="size-10" aria-label="Envoyer">
      <SendHorizontal />
    </Button>
  </form>
</section>
```

Message bubble:

```jsx
<div className={cn('flex max-w-[85%] gap-2', mine ? 'flex-row-reverse self-end' : 'self-start')}>
  {!mine && <UserAvatar user={m.auteur} className="mt-5 size-8 shrink-0" tone="muted" />}
  <div className={cn('flex min-w-0 flex-col gap-1', mine ? 'items-end' : 'items-start')}>
    {!mine && <span className="px-1 text-[11px] font-medium text-muted-foreground">{fullName(m.auteur)}</span>}
    <p className={cn(
      'rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words',
      mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md border bg-card',
      m.statut === 'envoi' && 'opacity-70',
      m.statut === 'echec' && 'bg-destructive-soft text-destructive',
    )}>
      {m.contenu}
    </p>
    <span className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
      {time(m.dateEnvoi)}
      {mine && m.statut === 'envoi' && <span>· Envoi…</span>}
      {mine && m.statut === 'echec' && (
        <button type="button" className="inline-flex items-center gap-1 font-medium text-destructive hover:underline">
          <CircleAlert className="size-3" /> Non envoyé · Réessayer
        </button>
      )}
    </span>
  </div>
</div>
```

Chat behavior:

- Keep a day separator (`Aujourd'hui`, `Hier`, long date) when the calendar day changes.
- Paginate backwards with `avant=<dateEnvoi>&limit=30`; preserve scroll position when loading older.
- Stick to bottom only when the user was already near the bottom (`< 80 px`).
- Optimistic message: `clientId = crypto.randomUUID()`, status `envoi`; on success merge by `clientId`; on failure status `echec` + toast; retry uses the same `clientId`.
- Merge and sort by `dateEnvoi`; deduplicate by `clientId || _id`.
- Enter sends, Shift+Enter inserts a newline, ignore Enter during IME composition.

## Group Meeting

```jsx
<section className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-xs" aria-labelledby="reunion">
  <h2 id="reunion" className="font-semibold">Réunion</h2>
  {reunion ? (
    <>
      <div className="flex items-start gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-success-soft text-success">
          <Video className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm leading-snug font-medium">{reunion.sujet}</p>
          <p className="text-xs text-muted-foreground">Ouverte par {animateur} · {relative(reunion.demarreeLe).toLowerCase()}</p>
        </div>
      </div>
      <Button asChild className="w-full">
        <a href={reunion.url} target="_blank" rel="noopener noreferrer"><Video /> Rejoindre la réunion</a>
      </Button>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1"><Copy /> Copier le lien</Button>
        {canEnd && <Button variant="ghost" size="icon" aria-label="Terminer la réunion"><PhoneOff /></Button>}
      </div>
    </>
  ) : (
    <>
      <p className="text-sm text-muted-foreground">Lancez une visioconférence pour réviser à plusieurs, sans quitter CampusHub.</p>
      <Button className="w-full"><Video /> Ouvrir une réunion</Button>
    </>
  )}
</section>
```

- `canEnd` = group creator or the member who started it.
- `navigator.clipboard.writeText` success/failure gets a French toast.
- Opening a meeting uses a toast with a “Rejoindre” action; do not auto-open a popup.
- `relative()` output is lowercased to read naturally (“il y a 5 min”).

## Forms and Dialogs

```jsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Planifier une séance</DialogTitle>
      <DialogDescription>Visible par tous les membres du groupe.</DialogDescription>
    </DialogHeader>

    <form id="session-form" className="flex flex-col gap-3.5" onSubmit={submit}>
      <FormError error={mutation.error} />
      <Field label="Sujet" error={champs.sujet}>
        <Input placeholder="Ex. Lois continues, exercices du TD 4" required autoFocus />
      </Field>
      <div className="grid grid-cols-[1fr_110px] gap-3">
        <Field label="Date et heure" error={champs.date}><Input type="datetime-local" required /></Field>
        <Field label="Durée (min)" error={champs.duree}><Input type="number" min={15} max={480} step={15} /></Field>
      </div>
      <Field label="Lieu" error={champs.lieu}><Input placeholder="Bibliothèque, salle 2 ou « En ligne »" required /></Field>
    </form>

    <DialogFooter>
      <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
      <Button type="submit" form="session-form" disabled={mutation.isPending}>Planifier</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Form rules:

- `Field` supplies `id`, `aria-invalid`, `aria-describedby`; use its function-child form for composite controls.
- `FormError` shows the API message; field errors come from `error.champs`.
- Disable submit while pending; change the label to a progressive form (`Envoi…`, `Ouverture…`).
- Reset transient fields on success; close the dialog; invalidate queries.
- Long forms (book/group creation) use a `Sheet`; destructive confirmations use `AlertDialog`.

Destructive confirmation:

```jsx
<AlertDialog open={Boolean(state)} onOpenChange={(o) => !o && onClose()}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{state?.title}</AlertDialogTitle>
      <AlertDialogDescription>{state?.description}</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Retour</AlertDialogCancel>
      <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={state?.onConfirm}>
        {state?.confirm}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## Loading, Empty and Error States

Skeleton grid:

```jsx
<div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4" aria-hidden="true">
  {Array.from({ length: 6 }, (_, i) => <GroupCardSkeleton key={i} />)}
</div>
```

Skeleton card keeps the final height:

```jsx
<div className="flex h-[196px] flex-col gap-3 rounded-lg border bg-card p-5" aria-hidden="true">
  <div className="h-5 w-24 rounded bg-muted animate-pulse" />
  <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
  <div className="h-4 w-full rounded bg-muted/70 animate-pulse" />
  <div className="mt-auto h-8 rounded bg-muted/70 animate-pulse" />
</div>
```

Empty state:

```jsx
<EmptyState
  icon={SearchX}
  title="Aucun groupe ne correspond"
  description="Essayez un autre mot-clé, ou créez ce groupe vous-même."
  action={<Button variant="outline"><Plus /> Créer un groupe</Button>}
/>
```

`EmptyState` visual:

```jsx
<div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-input px-6 py-12 text-center">
  <span className="flex size-11 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
    <Icon className="size-5" strokeWidth={1.75} />
  </span>
  <div className="flex max-w-sm flex-col gap-1">
    <p className="font-semibold">{title}</p>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
  {action}
</div>
```

Error state:

```jsx
<EmptyState
  icon={SearchX}
  title="Impossible de charger les annonces"
  description="Vérifiez votre connexion puis réessayez."
  action={<Button variant="outline" onClick={() => refetch()}>Réessayer</Button>}
/>
```

Rules:

- First load = skeleton; refetch with existing data = keep content and dim it (`opacity-60`) rather than replacing with a spinner.
- Empty states distinguish “none yet” from “none match” and “failed”.
- Every empty/error state gets a concrete next action.
- Skeletons are decorative: wrapper `aria-hidden="true"`; do not announce them.

## View Switch, Pagination and Navigation

```jsx
<nav aria-label="Annonces affichées" className="inline-flex w-fit items-center gap-1 rounded-lg bg-muted p-[3px]">
  <Link aria-current={active ? 'page' : undefined} className={cn(
    'rounded-md px-3 py-1 text-sm font-medium text-muted-foreground transition-[color,background-color,box-shadow] duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring',
    active && 'bg-background text-foreground shadow-xs dark:bg-input/30',
  )}>
    Toutes les annonces
  </Link>
</nav>
```

`Pagination`:

- `<nav aria-label="Pagination">`, previous/next `aria-label`, current page `aria-current="page"`, `tabular` page numbers, hidden when one page.

## Toasts and Mutations

```jsx
toast.success('Séance planifiée.');
toast.error(e.message);
toast.success('Réunion ouverte.', {
  description: 'Les membres peuvent la rejoindre depuis la page du groupe.',
  action: { label: 'Rejoindre', onClick: () => window.open(data.reunion.url, '_blank', 'noopener,noreferrer') },
});
```

- Success toast only when the result is not visible in the current viewport.
- Failure toast always explains the next step; do not toast on every background refetch.
- Invalidate the narrowest set of query keys after a mutation (`['groupe', id]`, `['groupes']`, `['groupe-messages', id]`).
- Optimistic mutations must restore the previous cache on error.

## Map

```jsx
<div className="overflow-hidden rounded-lg border bg-card shadow-xs">
  <MapContainer className="h-[320px] w-full" … />
</div>
```

- Map pin: `ch-map-pin__dot` with `--start` (`primary`) and `--end` (`success`).
- Leaflet container uses `bg-muted`, `text-foreground`, `z-index: 0`.
- Dark tiles are inverted globally; do not add a second filter on the container.
- Locations remain readable as text (labels, timeline) even if tiles fail.

## Landing and Auth

- Landing: max width 1200, 58 px hero on large screens, dot-grid background with a radial mask, tiles in a 6-column mosaic, one fixed brand-blue tile and one primary-soft tile.
- Auth: brand-blue left panel hidden below `lg`; form column max 400 px; mobile shows the brand above the form.
- These are the only screens where fixed brand hex is acceptable. Product pages use tokens.

## Responsive Behavior

| Range | Behavior |
|---|---|
| `< lg` | Sidebar becomes a left sheet; top bar shows the menu button; detail two-column stacks |
| `< md` | Public nav becomes a right sheet; book/group grids become one column; message list/thread swap |
| `< sm` | Page padding `px-4`; headers wrap; forms stack; action buttons may become full width |
| 320 px | No horizontal scroll; long names/messages truncate or wrap; icon buttons remain reachable |

Always check the mobile sheet, the filter card and the chat composer at narrow widths.
