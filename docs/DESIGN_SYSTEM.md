# Design System

DomiLink's visual identity combines restrained Claymorphism (soft dimensional
surfaces), editorial real-estate presentation, and a bold black/white/red
brand palette. This document is the source of truth; every page must draw
from these tokens rather than inventing new values inline.

## Color tokens (`app/globals.css`)

Token group names (`forest`/`ivory`/`sage`/`clay`/`charcoal`) predate the
current palette and are kept as-is since they're referenced throughout the
codebase — only the underlying hex values changed when the brand moved to
red/black/white. There is deliberately no separate accent color: `clay`
aliases onto the same red family as `brand`, so there is one hue doing both
primary and accent duty, plus neutral black/white/gray.

| Token | Hex | Use |
|---|---|---|
| `--color-forest-800` / `brand-800` | `#a00c30` (Embers) | Hero surfaces, deep brand fills |
| `--color-forest-600` / `brand-600` | `#da1a32` (Bonfire Red) | Primary buttons, links, brand marks |
| `--color-ivory-100` | `#f7f6f6` | Main canvas background (near Magnolia White) |
| `--color-surface` | `#ffffff` | Elevated cards, inputs (Magnolia White) |
| `--color-sage-200` | `#e8e8e8` | Selected filters, skeletons, secondary surfaces (neutral gray) |
| `--color-clay-500` | `#da1a32` (Bonfire Red) | Accent / primary conversion CTA — same hue as brand, no second accent color |
| `--color-charcoal-700` | `#1a1a1a` | Body text (near Black Swarm) |
| `--color-charcoal-400` | `#737373` | Secondary/metadata text |
| `--color-success/warning/error/info-500` | — | Status feedback, paired with a `-100` tint for backgrounds — unchanged, deliberately distinct from brand red so errors/success remain visually distinguishable from brand/accent elements |

Tailwind utility classes are generated from these via `@theme inline` (e.g.
`bg-brand-600`, `text-charcoal-500`, `bg-sage-100`). Dark mode redefines
`--background`/`--foreground`/`--color-surface`/`--color-border` under
`prefers-color-scheme: dark`.

Gradients are not used as a substitute for design; the hero's only treatment
is a flat Embers fill against the white/near-white canvas.

## Typography

- Interface font: **Manrope** (`--font-interface`, applied as `font-sans`) —
  body copy, labels, buttons, forms.
- Display font: **Plus Jakarta Sans** (`--font-display`, applied as
  `font-display`) — hero headlines, page titles, section headings, property
  prices.
- Both are loaded via `next/font/google` with `display: swap` so a slow font
  fetch never blocks rendering.
- Scale: hero `text-4xl sm:text-5xl font-semibold`, page title `text-2xl
  font-semibold`, section heading `text-xl font-semibold`, body `text-sm`/`
  text-base`, metadata `text-xs text-charcoal-400`.

## Shape & spacing

Corner radius scale (CSS vars): `--radius-sm` 10px (chips, small controls),
`--radius-md` 14px (inputs, buttons), `--radius-lg` 20px (standard cards),
`--radius-xl` 28px (feature cards, modals), `--radius-2xl` 36px (hero
promotional surfaces only). Spacing scale `--space-1`…`--space-8` (4px→64px)
backs all padding/gap decisions — avoid arbitrary pixel values in new
components.

## Shadows (Claymorphism)

- `--shadow-subtle` — resting secondary buttons, dividable surfaces.
- `--shadow-raised` — default card elevation (property cards, panels).
- `--shadow-floating` — sticky search bar, mobile tab bar, toasts.
- `--shadow-modal` — dialogs/drawers, paired with a translucent backdrop.
- `--shadow-clay-inset` — recessed surfaces (text inputs, filter wells).
- `--shadow-clay-raised` — tactile secondary cards (`<CardClay>`).

Shadows are soft, dual-toned, and tuned to stay visible against the white
canvas, tinted black to match the neutral palette. Not every surface gets
full clay treatment — flat surfaces are used where density/readability need
it (e.g. dense list rows, dashboard tables).

## Component inventory (`components/ui/`)

- `Button` (`buttonVariants`: primary / secondary / clay / ghost / danger;
  sizes sm/md/lg) — also exported as `buttonVariants` so `next/link` can be
  styled as a button without a fake polymorphic wrapper.
- `Badge` — neutral/brand/success/warning/error/info/clay variants for status
  and verification labels.
- `Card` / `CardClay` — standard raised surface vs. tactile clay surface.
- `Input` — labelled, with `hint`/`error` slots wired to `aria-describedby`
  and `aria-invalid`.
- `Skeleton` / `PropertyCardSkeleton` — loading states.
- `Dialog` — built on native `<dialog>` for free focus-trapping and
  Escape-to-close; used for confirmations and the subscription gate.
- `Drawer` — bottom-sheet on mobile, right-hand drawer on `sm:`+, used for
  search filters.

## Navigation

- `Header` — sticky, translucent-on-scroll, desktop horizontal nav +
  mobile hamburger panel.
- `MobileTabBar` — fixed bottom tab bar (Home/Search/Saved/Messages) on
  mobile only (`md:hidden`), with matching `pb-16 md:pb-0` spacer on `<main>`
  so content never sits under it.
- `Footer` — four-column sitemap + legal disclaimer line.

## Accessibility

Target WCAG 2.2 AA. `.focus-ring` utility (`app/globals.css`) gives a visible
2px brand-colored outline on `:focus-visible` everywhere; `prefers-reduced-
motion: reduce` collapses all animation/transition durations globally. Every
form control uses a real `<label>` tied via `htmlFor`/`id`; errors use
`role="alert"` and `aria-describedby`. Status must never be communicated by
color alone — pair badges with text/icons.

## Responsive rules

Mobile-first; verified at 390px (phone), 768px (tablet), 1280px (desktop).
Primary search/CTA stays reachable without scrolling on mobile. Filters move
into the `Drawer` bottom sheet below `sm:`. No horizontal overflow is
permitted — if a component threatens it, make it wrap or scroll
intentionally (`overflow-x-auto` with explicit affordance), not by accident.

## Property-card system (Milestone 3)

`components/properties/PropertyCard.tsx`: 4:3 cover image, category badge
(top-left) and availability badge (top-right) over the image, a floating
`FavouriteButton`, then price (display font, most prominent), title
(1-line clamp), location with a map-pin icon, and bed/bath counts — in that
priority order, matching the brief's "price must be visually prominent, no
competing CTAs" rule. `PropertyCardSkeleton` (`components/ui/Skeleton.tsx`)
mirrors the same layout for loading states. Search filters
(`components/properties/SearchFilters.tsx`) reuse the `Drawer` primitive on
mobile and a plain inline panel on `lg:`+ rather than inventing a second
pattern.

## Messaging patterns (Milestone 5)

`MessageThread` right-aligns the current user's own messages in brand red
on a white canvas, left-aligns the other participant's in neutral gray —
the same two-tone convention most people already read as "mine vs
theirs," rather than inventing a new one. The conversation list reuses the
unread-dot + relative-timestamp pattern from property cards instead of a
new badge system. `SubscriptionGateDialog` reuses the plain `Dialog`
primitive — the subscription upsell gets no special chrome, keeping it
visually consistent with every other modal in the product.

## Verification patterns (Milestone 6)

`VerificationBadge` reuses the plain `Badge` primitive (`variant="info"`)
with a shield icon — it never gets a special "trust" visual treatment that
would imply more certainty than the underlying review actually provides.
The verification center (`app/dashboard/verification/page.tsx`) reuses
the same status-badge-plus-icon convention as the subscription/payment
history in `/account`, rather than inventing a new status vocabulary.

## Admin & notification patterns (Milestone 7)

The admin console deliberately reuses the owner dashboard's layout
conventions (top nav bar, `Card`-based stat tiles, same badge variants for
status) rather than adopting a separate "admin theme" — it's still
DomiLink, just with a different nav. Moderation queues use the same
empty-state and card-list patterns as the owner's property list.
Notifications reuse the unread-dot convention from the messages list.

## Required but not yet built

Verification badges beyond the plain `Badge` primitive, and the admin
dashboard layout, land in Milestones 6 and 7 respectively and will be
documented here as they're built — this file is updated alongside the
components, not after the fact.
