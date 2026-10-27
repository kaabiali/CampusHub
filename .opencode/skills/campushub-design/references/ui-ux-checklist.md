# CampusHub UI/UX Checklist

Use the relevant section before coding, then the full review gate before declaring done.

## New Page

- [ ] Route exists in `client/src/router.jsx`; navigation label/icon added to `lib/nav.js` if it is a top-level destination.
- [ ] `PageHeader` with one clear `<h1>` and a one-sentence French description.
- [ ] One primary action at most; secondary actions use `outline`/`ghost`.
- [ ] Filters, view and page are URL-addressable and survive reload/back.
- [ ] Server-side search/filter/pagination; debounce text 300 ms; reset page on filter changes.
- [ ] Result count announced with `aria-live="polite"`; “Effacer les filtres” when filters are active.
- [ ] First load shows a skeleton matching the final grid.
- [ ] Empty, no-match and error states each have a next action.
- [ ] Cards have hover/focus treatment and a real link target.
- [ ] Layout works at 320 px, 768 px and 1280 px.
- [ ] Light and dark screenshots reviewed.

## New Component

- [ ] Reuses an existing `components/ui/*` primitive or a shared component.
- [ ] Props cover the states the page actually needs: idle, pending, error, empty, disabled.
- [ ] No raw hex, no arbitrary shadow, no second accent color.
- [ ] Icon-only control has a French `aria-label`; decorative icons are `aria-hidden`.
- [ ] Focus ring is visible and not clipped by `overflow-hidden`.
- [ ] Hover/active/focus/disabled states are distinguishable without color alone.
- [ ] Text truncates or wraps without overlap; numbers use `tabular`.
- [ ] Component is keyboard-operable and screen-reader understandable.
- [ ] If it appears in multiple pages, extract it rather than copy-pasting.

## Detail Page

- [ ] Back link to the parent list, labelled in French.
- [ ] Header card: tag/category, title, owner/animateur, description, status/capacity, primary action.
- [ ] Main content and aside use `lg:grid-cols-[minmax(0,1fr)_300px]` and stack below `lg`.
- [ ] Sections have `aria-labelledby` and an `<h2>`.
- [ ] Member-only content shows a lock + reason instead of a broken/disabled widget.
- [ ] Owner/member actions match the server roles; no action is shown that the API will reject.
- [ ] Destructive actions live away from the primary action and use `AlertDialog`.
- [ ] Meeting link, chat and documents are absent for non-members.
- [ ] Sticky elements (header, sidebar, chat) do not overlap content or the mobile keyboard.

## Forms

- [ ] Every control has a visible `Field` label; placeholders are examples, not labels.
- [ ] Required/optional state is clear; `aria-invalid` and `aria-describedby` are wired by `Field`.
- [ ] Field-level server errors appear under the right field using `error.champs`.
- [ ] Non-field errors appear in `FormError` with actionable French copy.
- [ ] Submit is disabled while pending; label changes to `Envoi…`, `Ouverture…`, etc.
- [ ] Success closes the dialog/sheet, resets transient fields and invalidates the right queries.
- [ ] `datetime-local` values are converted with `toTunisInput`/`fromTunisInput`.
- [ ] Number inputs have `min`/`max`/`step` where relevant.
- [ ] File inputs validate type and size and surface a French toast.
- [ ] First field is focused in dialogs; cancel returns focus to the trigger.
- [ ] Enter submits single-line forms; multiline chat uses Enter to send and Shift+Enter for a newline.

## Async and Data States

- [ ] Loading uses layout-matching skeletons, not a full-page spinner.
- [ ] Refetch with data keeps content visible (`keepPreviousData` + reduced opacity).
- [ ] Empty state explains why and offers the next step.
- [ ] No-match state suggests broadening the search or clearing filters.
- [ ] Error state offers “Réessayer” and keeps the page navigable.
- [ ] Mutations show pending state and a success/failure toast when the result is off-screen.
- [ ] Optimistic updates roll back on error; no fake success.
- [ ] Counts, capacity, unread badges and prices come from the API; no divergent client math.
- [ ] Pagination hides when there is one page; current page is `aria-current="page"`.

## Accessibility

Target: WCAG 2.2 AA, axe tags `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`, zero serious/critical.

- [ ] One `<main id="contenu">`; skip link “Aller au contenu” works.
- [ ] One `<h1>` per page; heading order is sensible.
- [ ] Landmarks are labelled (`Navigation principale`, `Pagination`, `Filtrer`, etc.).
- [ ] All images have useful `alt`; decorative images use `alt=""` or `aria-hidden`.
- [ ] Icon buttons have accessible names; no unlabeled “X” buttons.
- [ ] Form controls have labels; errors are programmatically associated.
- [ ] Focus is visible in both themes and never trapped outside a dialog.
- [ ] Dialogs/sheets have a title; descriptions explain the consequence.
- [ ] Color is not the only signal for status, errors or selection.
- [ ] Text contrast is at least 4.5:1 (large text 3:1); UI boundaries 3:1.
- [ ] `aria-live="polite"` is used for result counts and chat; not for every keystroke.
- [ ] `prefers-reduced-motion` is honored.
- [ ] Keyboard order matches visual order; Esc closes overlays; arrow keys work in the conversation list.
- [ ] Targets are large enough and not crowded on mobile.

## Responsive

- [ ] 320 px: no horizontal scroll, no clipped action, no overlapping text.
- [ ] 768 px: grids reflow, public nav becomes a sheet, detail stacks.
- [ ] 1024 px: desktop sidebar and top bar appear; two-column layouts fit.
- [ ] 1440 px: content stays within 1200 px; no stretched line lengths.
- [ ] Mobile sheet closes on navigation; body scroll is not trapped.
- [ ] Long French names, subjects and messages truncate/wrap correctly.
- [ ] Chat composer stays above the mobile keyboard; thread remains scrollable.

## Dark Mode

- [ ] Toggle light/dark/system actually changes the page.
- [ ] No hardcoded white/black text that becomes invisible.
- [ ] Primary button text uses `primary-foreground` (not always white).
- [ ] Borders and inputs remain visible against cards.
- [ ] Success/warning/destructive chips keep contrast.
- [ ] Map tiles, controls and attribution remain legible.
- [ ] Charts use `--chart-*`.
- [ ] Sonner toasts and popovers use the resolved theme.
- [ ] Axe passes in both themes.

## French Copy

- [ ] Every visible string is French, including toasts, errors, `aria-label`, `alt`, empty states and tooltips.
- [ ] Typographic apostrophes (`’`) and ellipsis (`…`) match existing copy.
- [ ] Buttons start with a verb: “Publier”, “Rejoindre”, “Planifier”, “Ouvrir”, “Copier”.
- [ ] Errors say what to do, not just what failed.
- [ ] Vocabulary is campus-specific: annonce, trajet, covoiturage, séance, réunion, filière, matière.
- [ ] ML output is labelled “estimation”; fallback/source is visible where it matters.
- [ ] Dates use `Africa/Tunis` and `fr-FR`; prices use `DT` and decimal comma.
- [ ] Relative time reads naturally (`relative()` lowercased where it starts a sentence fragment).
- [ ] Plurals use `plural()`; names use `fullName`/`shortName`.
- [ ] No English placeholder copy, no “Lorem ipsum”, no developer jargon in the UI.

## Member-Only and Security-Adjacent UI

- [ ] Non-members see a lock + explanation, not a disabled composer or hidden action.
- [ ] Group messages, documents and meeting URLs are never fetched or rendered for non-members.
- [ ] Meeting links open with `rel="noopener noreferrer"`.
- [ ] Owner-only and creator-only actions match server authorization.
- [ ] Report/block/admin actions are visibly distinct from normal actions.
- [ ] Deletion copy names what will disappear for whom.
- [ ] No sensitive data is placed in URLs, toasts or client logs.

## Realtime

- [ ] Socket events update the existing cache instead of forcing a full refetch.
- [ ] Messages deduplicate by `clientId`; optimistic entries reconcile with server entries.
- [ ] Ordering is stable by `dateEnvoi`.
- [ ] A reconnect or dropped socket leaves a readable state and a retry path.
- [ ] New messages do not steal scroll position unless the user was already at the bottom.
- [ ] Meeting/chat updates notify members who are elsewhere without leaking to non-members.

## Review Gate

Run before calling the work done:

- [ ] `npm run build -w client`
- [ ] `npm test` when API behavior changed
- [ ] `npm run test:e2e` when a flow changed (seeded services; Edge; mutates demo data)
- [ ] Manual keyboard pass on the changed page
- [ ] 320 px and 1440 px pass
- [ ] Light and dark pass
- [ ] Axe serious/critical = 0 on changed pages (and the standard pages in `e2e/smoke.spec.js`)
- [ ] French copy read aloud once
- [ ] No new hardcoded colors or one-off primitives
- [ ] Existing pages still look consistent (`Accueil`, `Livres`, `Covoiturage`, `Groupes`, `Événements`, `Messagerie`)

## Common Defects to Catch

| Defect | Fix |
|---|---|
| Page uses a spinner | Replace with a layout-matching skeleton |
| Empty state says “Aucune donnée” | Explain the situation and offer an action |
| Disabled send button with no reason | Show the lock/member requirement or helper text |
| White text on `--primary` in dark mode | Use `text-primary-foreground` |
| Hover-only affordance | Add focus-visible styles and keyboard access |
| Icon button “X” with no label | `aria-label="Supprimer …"` |
| Form error only in a toast | Show it in `Field`/`FormError` too |
| Filter change keeps page 4 | Reset `page` when filters change |
| Card grid jumps on load | Match skeleton dimensions to the card |
| Meeting link visible to non-members | Move the check server-side and hide the URL client-side |
| Chat jumps to bottom while reading history | Stick only when near bottom |
| Long subject overflows a card | `line-clamp-2`, `min-w-0`, `break-words` |
| Mobile drawer stays open after navigation | Close it in the nav click handler |
| `window.confirm` for deletion | Use `AlertDialog` with explicit consequence |
| English API error shown | Map to a French message or use the API’s French envelope |
| Raw hex added “just this once” | Add or reuse a semantic token |
