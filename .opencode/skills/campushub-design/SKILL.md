---
name: campushub-design
description: "CampusHub-specific design and UI/UX guidance for the MERN student platform. Use when designing, building, reviewing, or fixing any CampusHub page, component, layout, form, dialog, empty/loading/error state, dark mode, responsive behavior, French copy, or accessibility. Covers the approved visual direction, light/dark tokens in client/src/index.css, Tailwind v4 + shadcn/Radix conventions, page/component recipes, member-only states, and the WCAG 2.2 AA checks run by Playwright."
argument-hint: "[page or component]"
license: MIT
metadata:
  author: CampusHub
  version: "1.0.0"
---

# CampusHub Design & UI/UX

Project-specific design guidance for the CampusHub MERN student platform. Pair it with the generic skills instead of re-deriving a visual language: `design`, `design-system`, `ui-styling`, `ui-ux-pro-max`.

## When to Use

- Adding or changing a CampusHub screen, layout, component, dialog, form, or state.
- Choosing colors, spacing, type, shadows, radii, icons, or motion.
- Reviewing a page for consistency, responsiveness, dark mode, or accessibility.
- Writing or reviewing French UI copy, errors, empty states, or dates/prices.
- Implementing member-only content such as group chat, documents, or meeting links.
- Auditing a page before a demo or before running Playwright.

## Source of Truth

| Concern | File |
|---|---|
| Approved scope and UI/UX constraints | `docs/PLAN.md` (Phase 0, Phase 8 "UI trust", Phase 9) |
| Approved design visualization | `visuals/plan-campushub-mern-1.html` |
| Tokens, fonts, shadows, dark mode, motion | `client/src/index.css` |
| shadcn/Radix primitives and variants | `client/src/components/ui/` |
| App shell and navigation | `client/src/components/layout/AppShell.jsx`, `client/src/lib/nav.js` |
| Shared page pieces | `PageHeader`, `EmptyState`, `Pagination`, `ViewSwitch`, `Field`, `FormError`, `UserAvatar` |
| Recent reference composition | `client/src/pages/groupes/GroupeDetail.jsx`, `components/groups/GroupChat.jsx`, `components/groups/GroupMeeting.jsx` |
| French dates, prices, names | `client/src/lib/format.js` |
| Accessibility gate | `e2e/smoke.spec.js` (axe: wcag2a, wcag2aa, wcag21aa, wcag22aa; serious/critical must be zero) |

If code and prose disagree, the code in `index.css` and the shared components wins for implementation; `docs/PLAN.md` wins for intent.

## Design Intent

CampusHub should feel like a calm, dense campus utility, not a marketing site.

- **Academic and trustworthy.** Brand blue, near-neutral surfaces, clear hierarchy, restrained decoration.
- **Content-first.** Real listings, dates, names, prices and states lead; chrome stays quiet.
- **Compact but breathable.** Dense lists and cards, `gap-3`/`gap-4`/`gap-6` rhythm, generous page padding.
- **One blue accent.** Blue marks action, selection, links and active navigation. Status colors are reserved for status.
- **Soft depth.** Borders do most of the work; shadows are subtle and tinted with the background hue.
- **French-first.** Every visible string, error and empty state is in French.
- **Honest data.** ML output is labelled an estimation; derived counts and capacity are shown explicitly.
- **Accessible by default.** Light and dark must both pass WCAG 2.2 AA; keyboard and screen-reader paths are part of "done".

## Non-Negotiables

1. Use semantic tokens from `client/src/index.css`; do not add raw hex or arbitrary colors in components.
2. Reuse `components/ui/*`, `Button`, `Field`, `EmptyState`, `PageHeader`, `Pagination`, `UserAvatar` and existing patterns before creating new primitives.
3. Keep all user-facing copy in French, including validation, errors, toasts, `aria-label`s and empty states.
4. Design every async surface for **loading, empty, no-match, error and success**; skeletons should match the final layout.
5. Icon-only controls need an accessible name; decorative icons need `aria-hidden`.
6. Never expose member-only data (group messages, documents, meeting URLs) in the UI to non-members; the API enforces it too.
7. Support light, dark and system themes; test both themes.
8. Respect `prefers-reduced-motion`; no animation is required to understand state.
9. Keep destructive actions behind confirmation and make the destructive intent explicit.
10. Any UI change must survive the existing axe audit and a 320 px-wide viewport.

## Design Tokens

The full token table is in `references/design-tokens.md`. Core values:

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#f6f7f9` | `#0e1014` | App canvas |
| `--foreground` | `#14171c` | `#eceef2` | Headings, primary text |
| `--foreground-2` | `#3d4450` | `#c4cad4` | Body copy, nav labels |
| `--card` | `#ffffff` | `#171a20` | Cards, sidebar, panels |
| `--muted-foreground` | `#5b6370` | `#9aa2ae` | Metadata, hints, placeholders |
| `--primary` | `#2547d0` | `#6a87f5` | Primary action, links, active nav |
| `--primary-soft` | `#e9eefc` | `#1d2747` | Selected nav, tags, recommendation tint |
| `--border` | `#e3e6eb` | `#2a2f38` | Default border |
| `--success` | `#1f7a4d` | `#6fcf9c` | Available, member, confirmed |
| `--warning` | `#9a4a0b` | `#f0a35e` | Full, near-capacity, caution |
| `--destructive` | `#b42318` | `#e5584b` | Delete, report, errors |

- Type: Geist Variable for UI, Geist Mono Variable for times, prices, counts and technical labels.
- Radius: `rounded-md` (6 px) for controls, `rounded-lg` (8 px) for cards/panels, `rounded-xl` (12 px) for hero tiles, `rounded-full` for pills/avatars.
- Shadows: `shadow-xs` on cards/inputs, `shadow-sm` on hover, `shadow-md`/`shadow-lg` for popovers and landing art.
- Numbers that should align use the `tabular` utility.

Semantic color rules:

| Meaning | Treatment |
|---|---|
| Primary action | `bg-primary text-primary-foreground`, hover `bg-primary-hover` |
| Secondary action | `variant="outline"` or `variant="soft"` |
| Selection / affiliation | `bg-primary-soft text-primary-soft-foreground` |
| Success / member / available | `*-soft` background + `text-success` |
| Full / warning | `*-soft` background + `text-warning` |
| Destructive | `text-destructive`, `bg-destructive-soft`, confirm with `AlertDialog` |
| Metadata | `text-muted-foreground` |
| Body copy | `text-foreground-2` |

## Layout System

**App shell** (`AppShell.jsx`)

- Desktop: `lg:grid lg:grid-cols-[248px_minmax(0,1fr)]`; sidebar sticky `h-dvh`, `border-r`, `bg-card`.
- Mobile: sidebar hidden; `Sheet` drawer `w-[280px]` from the left.
- Top bar: sticky `h-14`, `bg-background/85`, `backdrop-blur-md`, border-bottom; search/command trigger, notifications.
- Main: `mx-auto w-full max-w-[1200px]`, `px-4 sm:px-6 lg:px-10`, `pt-6 lg:pt-8`, `pb-16`, `gap-6`, `animate-fade-up`.
- Skip link: “Aller au contenu”, target `#contenu`; keep it on the app and public layouts.
- Sidebar navigation: lucide icon `size-[18px]`, label, optional count badge; active = `bg-primary-soft text-primary-soft-foreground font-semibold`.
- Admin navigation appears under an “Administration” label only for admins.

**Public and auth**

- Public: sticky `h-16` header, max width 1200, brand + section links + account actions, footer with brand and legal links.
- Auth: split grid `lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]`; left brand panel is fixed `#2547d0` in both themes because white text stays above 7:1; form column max width 400 px.

**Page composition**

- Start with `PageHeader` (`text-2xl sm:text-[28px]`, `font-semibold tracking-tight`, description max 65ch).
- Sections use `flex flex-col gap-3` and an `<h2>` with `aria-labelledby`.
- Detail pages: header card, then `grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start` (content + aside).
- Dashboard: `lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]`.
- Card grids: `grid-cols-[repeat(auto-fill,minmax(210px,1fr))]` for books, `minmax(260px,1fr)` for groups; `gap-4`.
- Filters: bordered card, `p-4`, responsive grid; chips for multi-select states.

Full recipes: `references/component-patterns.md`.

## Component Rules

- **Button**: use the `default`, `soft`, `outline`, `ghost`, `destructive` and `link` variants as shipped. Sizes `xs/sm/default/lg`, icon sizes `icon-xs/icon-sm/icon/icon-lg`. Row actions are ghost icon buttons with `aria-label`; destructive row actions get `text-destructive hover:bg-destructive-soft`.
- **Card / panel**: `rounded-lg border bg-card p-5 shadow-xs`; interactive cards may add `transition-[border-color,box-shadow] duration-150 hover:border-input hover:shadow-sm`.
- **Dialogs**: `Dialog` for focused create/edit flows (`sm:max-w-md`), `AlertDialog` for destructive confirmation, `Sheet` for longer forms. Always include `DialogTitle`; describe consequences in the description.
- **Forms**: wrap controls in `Field`; it wires `htmlFor`, `aria-invalid` and `aria-describedby`. Show server field errors from `error.champs`; show non-field errors with `FormError`. Submit button uses `form="..."` when the footer is outside the form; pending state changes the label (`Envoi…`, `Ouverture…`) and disables the control.
- **Empty state**: use `EmptyState` with an icon, a specific title and a next action. Distinguish “nothing yet”, “no match” and “failed to load”.
- **Status chips**: subject tags use `rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-soft-foreground`; counts and capacity use `tabular`.
- **Avatars**: `UserAvatar`, `tone="accent"` for owners/creators, `tone="muted"` elsewhere. Show initials when there is no photo.
- **View switches**: URL-addressable views are links in a `<nav>` with `aria-current="page"` (`ViewSwitch`), not ARIA tabs.
- **Pagination**: `Pagination` with previous/next labels and `aria-current="page"`; hide when there is one page.
- **Toasts**: Sonner, bottom-right, themed. Use `toast.success`/`toast.error`, short French sentences, and an action only when it continues the task (e.g. “Rejoindre”).
- **Maps**: Leaflet must stay inside themed surfaces; start pin `--primary`, end pin `--success`; dark tiles are inverted in `index.css`. Map is an enhancement, never the only way to read a location.
- **Charts**: use `--chart-1..5`; never invent a new palette.

## Page Patterns

**List / explore page**

1. `PageHeader` with one primary create action.
2. Optional `ViewSwitch` for “all / mine” views.
3. URL-backed filters (`useSearchParams`), 300 ms debounce, page reset on filter change, `replace: true`.
4. Result count in an `aria-live="polite"` line; offer “Effacer les filtres” when filters are active.
5. Skeleton grid matching the real card size; `keepPreviousData` with reduced opacity while refetching.
6. Empty state variants, then an error state with “Réessayer”.
7. `Pagination` at the bottom.

**Detail page**

- Back link to the parent list with an arrow.
- Header card: category/tag, title, owner/animateur, description, capacity/status, primary action.
- Main content in sections; aside holds contextual actions (meeting, members) on desktop.
- Member-only sections show a lock icon and a clear reason instead of hiding the section entirely; actions only appear for permitted roles.
- Destructive actions sit away from the primary action and require confirmation.

**Group chat + meeting** (member-only reference)

- Non-members see a lock panel, never a disabled composer or a hidden meeting URL.
- Chat: day separators, own messages right-aligned in primary, others left-aligned on card, author name on others, relative time, optimistic “Envoi…” then failure + “Réessayer”.
- Composer: Enter sends, Shift+Enter adds a line; max 2000 characters; send button labelled “Envoyer”.
- Meeting: show subject, starter and relative start time; primary “Rejoindre la réunion” opens a new tab with `noopener noreferrer`; “Copier le lien” confirms via toast; only creator/starter can end it.
- Realtime cache updates must preserve ordering and deduplicate by `clientId`.

## UX Rules

- **Navigation is URL state.** Filters, tabs, selected conversation and create dialogs opened from a query param must survive reload/back.
- **Mutations are explicit.** Disable the triggering control while pending; invalidate affected query keys; keep the user in context; confirm success with a toast when the change is not visible on screen.
- **Optimistic UI must roll back.** On error, restore the previous state and show a French toast. Never leave a fake success.
- **Counts must be honest.** Capacity bars, unread badges and result counts come from the server; do not derive a different number in the UI.
- **Errors are actionable.** Say what failed and what to do (“Vérifiez votre connexion puis réessayez.”). Do not surface raw English API text.
- **Destructive actions name the object and consequence.** “Supprimer ce groupe ?” + what disappears; cancel is “Retour” or “Annuler”, never “Non”.
- **Loading keeps layout stable.** Skeleton dimensions mirror the final component; no full-page spinner for a section.
- **Empty states sell the next step.** One sentence of context + one action.
- **Realtime is an enhancement.** A dropped socket must leave a readable, refetchable state; pending messages can be retried by `clientId`.
- **Dates and money are localized.** `Africa/Tunis`, `fr-FR`, `DT`, decimal comma, relative time for recent events. `datetime-local` values are read/written as Tunis time.
- **Search is forgiving.** Normalize accents for local filtering (see conversation list), debounce server search, and explain when no result matches.
- **No dead ends.** Every error/empty page offers a link back or a retry.

## Accessibility & Themes

- Target WCAG 2.2 AA in **both** themes; the gate is axe with `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`, zero serious/critical violations.
- Keep the skip link, one `<main id="contenu">`, labelled `<nav>` landmarks, and one `<h1>` per page (`sr-only` is acceptable for app-like screens).
- Every icon-only button needs `aria-label` in French; every decorative icon gets `aria-hidden="true"` or is inside an `aria-hidden` wrapper.
- Labels are always visible or programmatically associated. Placeholders are not labels.
- Focus must be visible: shadcn controls use `focus-visible:ring-[3px] focus-visible:ring-ring/50`; custom controls use `focus-visible:outline-2 focus-visible:outline-ring`.
- Dialogs and sheets need a title and description; do not trap focus outside the primitive.
- Chat and result counts use `aria-live="polite"`; do not announce every keystroke.
- State must not rely on color alone: pair status color with text or an icon.
- Dark mode is class-based (`.dark`). The primary becomes lighter with dark text (`--primary-foreground: #0b1020`) to keep contrast; never hardcode white text on the dark primary.
- Map tiles are inverted only in dark mode; controls and attribution use tokens.
- Respect `prefers-reduced-motion`: the global rule collapses animation/transition to 1 ms and disables smooth scrolling.
- Responsive: sidebar becomes a sheet below `lg`; two-column detail layouts stack; grids use `auto-fill`; message list and thread swap on mobile; no horizontal scrolling at 320 px.

## French Content

- Sentence case for headings and buttons. Use typographic apostrophes (`’`), ellipsis (`…`), and non-breaking spacing conventions already present in the code.
- Prefer campus vocabulary: annonce, trajet, covoiturage, groupe d’étude, séance, réunion, filière, matière, conducteur, passager.
- Buttons are verbs: “Publier une annonce”, “Rejoindre le groupe”, “Planifier une séance”, “Ouvrir une réunion”.
- Errors explain the fix, not the stack: “PDF trop lourd (20 Mo maximum).”
- ML values are “estimations”, never promises; show the source/fallback when relevant.
- Prices use `price()` (`18 DT`), dates use `format.js`, names use `fullName`/`shortName`, plurals use `plural()`.
- Empty states use full sentences with a next step, not “Aucune donnée”.

## Verification

- Build: `npm run build -w client`
- Unit/API suite: `npm test`
- E2E + axe: `npm run test:e2e` (requires seeded services; Playwright uses Edge and mutates demo data)
- For a focused UI check, compare against the reference pages: `Livres`, `Covoiturage`, `Groupes`, `GroupeDetail`, `Evenements`, `Messagerie`, `Accueil`.
- Before declaring done: keyboard pass, 320 px pass, light + dark pass, axe pass, French copy pass.

## Generic Skills

- `design-system` — only when a genuinely new token or token layer is needed; the project already has a semantic layer.
- `ui-styling` — shadcn/Tailwind implementation details, theming, responsive utilities, accessible primitives.
- `ui-ux-pro-max` — targeted UX research and review. Search one outcome at a time, e.g.:
  - `python .opencode/skills/ui-ux-pro-max/scripts/search.py "message send failure retry" --domain ux`
  - `python .opencode/skills/ui-ux-pro-max/scripts/search.py "empty state next action" --domain ux`
  - `python .opencode/skills/ui-ux-pro-max/scripts/search.py "dialog focus return" --domain ux`
  - `python .opencode/skills/ui-ux-pro-max/scripts/search.py "compact card overflow" --stack html-tailwind`
- `design` — broader brand/CIP/slide/banner work; not needed for routine product UI.

Do not copy generic reference dumps into this skill. Link to the generic skill and apply the project rules above.

## Don't

- Don't introduce a second blue, purple gradients, glassmorphism, or decorative blobs.
- Don't use raw `#fff`, `#000`, gray-500, `shadow-xl` or arbitrary `text-[#...]` when a token exists.
- Don't use `window.alert`, `confirm` or `prompt`.
- Don't hide a required label and rely on a placeholder.
- Don't use ARIA tabs for URL-addressable views or fake buttons for links.
- Don't make the user guess whether an action succeeded; show pending, success or failure.
- Don't expose member-only content to non-members “because the API blocks it”.
- Don't add motion that ignores reduced-motion or delays the task.
- Don't write English UI copy, English toast text or English `aria-label`s.

## References

| Topic | File |
|---|---|
| Full light/dark tokens, type, radii, shadows, Tailwind mapping | `references/design-tokens.md` |
| Copy-ready layout and component recipes | `references/component-patterns.md` |
| Page/component/review checklists | `references/ui-ux-checklist.md` |
