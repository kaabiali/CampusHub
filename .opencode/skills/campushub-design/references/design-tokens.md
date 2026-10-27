# CampusHub Design Tokens

Canonical source: `client/src/index.css`. The mockup palette is carried onto shadcn variable names, then exposed to Tailwind v4 through `@theme inline` (`--color-*`). Use the semantic utilities (`bg-card`, `text-muted-foreground`, `border-border`, `ring-ring`) rather than the raw CSS variables when writing JSX.

## Color Tokens

| Token | Light | Dark | Typical use |
|---|---|---|---|
| `--background` | `#f6f7f9` | `#0e1014` | App canvas, page background |
| `--foreground` | `#14171c` | `#eceef2` | Headings, primary text |
| `--foreground-2` | `#3d4450` | `#c4cad4` | Body copy, nav labels, secondary emphasis |
| `--card` | `#ffffff` | `#171a20` | Cards, sidebar, panels, sticky bars |
| `--card-foreground` | `#14171c` | `#eceef2` | Text on cards |
| `--popover` | `#ffffff` | `#1b1f26` | Menus, popovers, tooltips |
| `--popover-foreground` | `#14171c` | `#eceef2` | Text in popovers |
| `--primary` | `#2547d0` | `#6a87f5` | Primary buttons, links, active nav |
| `--primary-hover` | `#1a36a6` | `#8199f7` | Primary hover |
| `--primary-foreground` | `#ffffff` | `#0b1020` | Text/icon on primary |
| `--primary-soft` | `#e9eefc` | `#1d2747` | Selected nav, tags, recommendation tint |
| `--primary-soft-foreground` | `#1a36a6` | `#afc0ff` | Text on primary-soft |
| `--secondary` | `#f0f2f5` | `#222731` | Secondary buttons/surfaces |
| `--secondary-foreground` | `#14171c` | `#eceef2` | Text on secondary |
| `--muted` | `#f0f2f5` | `#1e222a` | Skeleton base, muted surfaces |
| `--muted-foreground` | `#5b6370` | `#9aa2ae` | Metadata, hints, placeholders |
| `--accent` | `#eef0f3` | `#222731` | Hover background for ghost controls/rows |
| `--accent-foreground` | `#14171c` | `#eceef2` | Text on accent |
| `--destructive` | `#b42318` | `#e5584b` | Delete, report, validation errors |
| `--destructive-soft` | `#fceceb` | `#3a1d1b` | Destructive hover/background |
| `--success` | `#1f7a4d` | `#6fcf9c` | Available, member, confirmed, positive |
| `--success-soft` | `#e3f3ea` | `#14301f` | Success chip/background |
| `--warning` | `#9a4a0b` | `#f0a35e` | Full, near-capacity, caution |
| `--warning-soft` | `#fdf3e1` | `#3a2b14` | Warning chip/background |
| `--border` | `#e3e6eb` | `#2a2f38` | Default borders and separators |
| `--input` | `#cdd2da` | `#3a404b` | Input borders, dashed hover borders |
| `--ring` | `#2547d0` | `#6a87f5` | Focus ring |
| `--chart-1` | `#2547d0` | `#6a87f5` | Primary chart series |
| `--chart-2` | `#a9bbf2` | `#33427a` | Secondary series |
| `--chart-3` | `#1f7a4d` | `#6fcf9c` | Positive series |
| `--chart-4` | `#c27a1a` | `#f0a35e` | Caution series |
| `--chart-5` | `#7a3b2e` | `#e08a74` | Fifth series |
| `--shadow-color` | `220 20% 10%` | `220 40% 2%` | Tinted shadow hue |

### Why dark primary changes

In dark mode `--primary` is lighter (`#6a87f5`) and `--primary-foreground` is dark (`#0b1020`). White text on a mid blue cannot reach 4.5:1 while the same blue stays legible as text. Do not override this pairing.

### Fixed brand colors

Two places intentionally use fixed brand blue in both themes:

- `AuthLayout.jsx` brand panel: `bg-[#2547d0] text-white` — white on `#2547d0` is above 7:1.
- `Landing.jsx` primary tile / CTA panel: `bg-[#2547d0] text-white`; button text uses `#1a36a6`.
- Book cover art uses intentional inline cover colors (`#1e2a4a`, `#2547d0`, `#3f5e4b`, `#7a3b2e`) as artwork, not UI tokens.

Everything else uses semantic tokens.

## Typography

| Token | Value |
|---|---|
| `--font-sans` | `'Geist Variable', system-ui, -apple-system, 'Segoe UI', sans-serif` |
| `--font-mono` | `'Geist Mono Variable', ui-monospace, 'Cascadia Mono', monospace` |
| Body | `font-sans antialiased`, `font-feature-settings: 'ss01', 'cv11'` |
| Headings `h1, h2, h3` | `text-wrap: balance`, `letter-spacing: -0.02em` |
| Paragraphs | `text-wrap: pretty` |
| Selection | `background: var(--primary-soft)`, `color: var(--primary-soft-foreground)` |

Observed scale:

| Role | Classes |
|---|---|
| Page title | `text-2xl font-semibold tracking-tight sm:text-[28px]` |
| Section title | `font-semibold` (often `text-lg` on dashboard cards) |
| Card title | `text-base leading-snug font-semibold tracking-normal` |
| Body | `text-sm` / `text-[15px]`, `leading-relaxed` |
| Metadata | `text-[13px]` or `text-xs`, `text-muted-foreground` |
| Micro label | `text-[11px]` (chat author/time, date tiles) |
| Hero display | `text-[40px] leading-[1.04] tracking-[-0.035em] sm:text-5xl lg:text-[58px]` |
| Numeric/metric | `font-mono` and/or `tabular`; stat value `text-[28px] leading-none font-semibold tracking-tight` |

Use `tabular` for prices, times, counts, capacity, pagination and any column of numbers. Use `font-mono` for times/prices in timelines and technical labels. Avoid all-caps except small tags (`uppercase` on month labels and eyebrow text).

## Radius

`--radius: 0.5rem` (8 px), mapped as:

| Token | Value | Typical use |
|---|---|---|
| `rounded-sm` | 4 px | Focus outline on inline links |
| `rounded-md` | 6 px | Buttons, inputs, nav items, small panels |
| `rounded-lg` | 8 px | Cards, sections, dialogs, chat container |
| `rounded-xl` | 12 px | Landing tiles, large CTA panels |
| `rounded-full` | 999 px | Avatars, pills, count badges, capacity bar |

## Shadows

Tinted with `--shadow-color` instead of flat black:

```css
--shadow-xs: 0 1px 2px hsl(var(--shadow-color) / 0.05);
--shadow-sm: 0 1px 2px hsl(var(--shadow-color) / 0.05),
             0 2px 6px hsl(var(--shadow-color) / 0.04);
--shadow-md: 0 2px 4px hsl(var(--shadow-color) / 0.06),
             0 8px 20px hsl(var(--shadow-color) / 0.07);
--shadow-lg: 0 4px 10px hsl(var(--shadow-color) / 0.08),
             0 20px 48px hsl(var(--shadow-color) / 0.14);
```

- Default card/input: `shadow-xs`.
- Hover lift: `hover:shadow-sm`.
- Popovers/tooltips: `shadow-md`.
- Landing art and auth panels: `shadow-lg`.
- Never use flat black shadows or `shadow-xl` on product surfaces.

## Spacing and Layout

| Context | Value |
|---|---|
| Page max width | `max-w-[1200px]` |
| App shell sidebar | `248px` |
| App shell top bar | `h-14` (56 px) |
| Public header | `h-16` (64 px) |
| Main padding | `px-4 sm:px-6 lg:px-10`, `pt-6 lg:pt-8`, `pb-16` |
| Main section gap | `gap-6` |
| Cards/panels | `p-4`, `p-5`, `sm:p-6` |
| Control height | `h-9` default, `h-8` small, `h-10` large; icon `size-9` |
| Control padding | `px-4` default, `px-3` small |
| Card grids | `gap-4`, `auto-fill minmax(210px,1fr)` books / `260px` groups |
| Detail grid | `lg:grid-cols-[minmax(0,1fr)_300px]` |
| Dashboard grid | `lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]` |
| Auth split | `lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]` |
| Mobile drawer | `w-[280px]` |

## Motion

| Token / pattern | Value |
|---|---|
| `--animate-fade-up` | `fade-up 200ms ease-out both` |
| `fade-up` | `opacity: 0; translateY(6px)` → `opacity: 1; none` |
| Control transitions | `150ms ease-out` for color/background/border/shadow; button also `transform` |
| Hover lift | `hover:-translate-y-0.5` on landing tiles only |
| Reduced motion | All animation/transition set to `1ms`, smooth scroll off |

Use motion to confirm a change (page enter, validation message, card lift), not to decorate idle UI.

## Tailwind Mapping

`@theme inline` exposes:

`--color-background`, `--color-foreground`, `--color-foreground-2`, `--color-card`, `--color-card-foreground`, `--color-popover`, `--color-popover-foreground`, `--color-primary`, `--color-primary-hover`, `--color-primary-foreground`, `--color-primary-soft`, `--color-primary-soft-foreground`, `--color-secondary`, `--color-secondary-foreground`, `--color-muted`, `--color-muted-foreground`, `--color-accent`, `--color-accent-foreground`, `--color-destructive`, `--color-destructive-soft`, `--color-success`, `--color-success-soft`, `--color-warning`, `--color-warning-soft`, `--color-border`, `--color-input`, `--color-ring`, `--color-chart-1..5`.

Practical equivalents:

| Need | Class |
|---|---|
| Canvas | `bg-background text-foreground` |
| Card | `bg-card text-card-foreground border shadow-xs` |
| Muted surface | `bg-muted` |
| Subtle hover | `hover:bg-accent` |
| Body secondary | `text-foreground-2` |
| Metadata | `text-muted-foreground` |
| Focus ring (custom) | `focus-visible:outline-2 focus-visible:outline-ring` |
| Focus ring (shadcn) | `focus-visible:ring-[3px] focus-visible:ring-ring/50` |
| Invalid field | `aria-invalid:border-destructive aria-invalid:ring-destructive/20` |

## Theme Rules

- Theme preference is stored in `localStorage` under `campushub-theme` with `light | dark | system`; the provider toggles `.dark` on `<html>` and sets `color-scheme`.
- Default is `system`.
- Sonner is themed from the resolved theme.
- Every token must be checked in both themes, especially `primary`, `success`, `warning`, `destructive`, `border`, `input` and chart colors.
- OSM tiles ship light-only; dark mode applies `invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.9) saturate(0.7)` to `.leaflet-tile-pane`.
