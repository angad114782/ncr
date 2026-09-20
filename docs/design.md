# Design — NCR Estates

> Visual language and UX patterns. Related: [prd.md](prd.md) · [architecture.md](architecture.md) · [rules.md](rules.md) · [tasks.md](tasks.md) · [memory.md](memory.md)

## 1. Design language

**iOS "Liquid Glass"** — translucent, tinted glass surfaces over a warm neutral canvas; heavy rounded corners; SF Pro-style type; spring motion; floating nav and tab bars. Adapts to light and dark. The **brand palette is mocha brown + cream**, replacing default iOS blue.

Principles:
1. **Glass for surfaces, color for actions.** The canvas stays neutral; brand color shows up only on buttons, links, badges and active states.
2. **Depth through blur, not borders.** Backdrop blur + soft shadow + 1px highlight edge.
3. **Motion has physics.** Springs and small lifts, never linear slides.
4. **One source of truth.** All colors, radii and blur values are CSS tokens in `src/index.css`.

## 2. Color tokens

Defined in `:root` (light) and `:root[data-theme="dark"]` (dark). Always use the variable.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-accent` | `#674E40` mocha | `#D9A876` caramel | Primary buttons, links, active nav |
| `--color-accent-2` | `#A9603C` terracotta | `#C97B4F` | Secondary highlights |
| `--color-success` | `#34C759` | `#30D158` | Verified, positive (not re-themed) |
| `--color-danger` | `#FF3B30` | `#FF453A` | Delete, saved-heart (not re-themed) |
| `--color-warning` | `#D9A441` gold | `#E0B04A` | Star ratings, pending |
| `--color-purple / indigo / teal / pink` | iOS system | iOS system (dark) | Reserved for future categorical use |
| `--bg-base` | `#EFE3D7` cream | `#15100C` warm black | Page canvas |
| `--bg-base-2` | `#E4D3C0` | `#221B15` | Secondary surface, map bg |
| `--text-primary` | `#2A2118` | `#F5ECE1` | Body |
| `--text-secondary` | 62% primary | 62% primary | Supporting text (`.text-secondary`) |
| `--text-tertiary` | 32% primary | 32% primary | Hints (`.text-tertiary`) |

**Exceptions (hardcoded on purpose):** WhatsApp green `#25D366`; map pin colors (School `#674E40`, Mall `#C97B4F`, Hospital red, Metro green).

Body background: flat `--bg-base` + **one** soft radial glow in the accent (`color-mix(in srgb, var(--color-accent) 14%, transparent)`, top-right, fades by 55%). No multi-color wash.

## 3. Glass primitives

| Class | Purpose |
|---|---|
| `.glass` | Default card/surface: tint + `blur(28px) saturate(180%)` + border + shadow + gradient edge highlight (`::before`) |
| `.glass-strong` | More opaque — modals, sheets, sticky bars |
| `.glass-weak` | Lighter, `blur(16px)` — chips, overlays |
| `button.glass:hover`, `a.glass:hover` | Deepen tint on hover (clickable glass only) |
| `.spring` | Bouncy transform easing `cubic-bezier(0.34,1.56,0.64,1)` |
| `.map-dark-filter` | Inverts OSM tiles for dark mode (tile pane only) |

Surface tokens: `--glass-surface`, `--glass-surface-strong`, `--glass-surface-weak`, `--glass-border`, `--glass-highlight`, `--glass-shadow`, `--glass-blur`, `--nav-surface`.

> ⚠️ `.glass` sets `position: relative`. Never put `sticky/fixed/absolute` utilities on the same node — use a wrapper. (See [rules.md](rules.md) §3.)

## 4. Components

| Component | Notes |
|---|---|
| `GlassButton` | Variants `primary` (accent bg), `danger`, `glass`, `ghost` (transparent, weak-glass hover). Hover: `brightness-110` on primary/danger, tint deepen on glass. Shadow glow is `color-mix` of the accent/danger variable. Framer `scale 1.02` on hover. |
| `GlassCard` | Base surface; pass padding only. |
| `GlassInput` | Optional leading icon; `onIconClick` enables actions (e.g. show/hide secret). |
| `GlassSheet` | Bottom-sheet/modal — used by `AuthSheet` and CSV import review. |
| `ThemeToggle` | Light / dark; persists `re-theme`. |
| `Reveal` | Scroll-in animation wrapper used across Home sections. |
| `PropertyCard` | Image, price label, badges, save + compare actions, hover lift. |
| `StatusBadge` | "Active" / "Not configured" pattern — a local helper inside `AdminSettings.jsx`, not a shared component. |
| `CeoAvatar` | Real photo when `COMPANY.ceo.photo` is set, otherwise accent-coloured initials in a glass circle. Never a stock photo. |
| Admin list screen | `CollectionAdmin`: title + counts, header actions (Restore samples · Add · CSV Template/Export/Import), search + All/Active/Inactive pills, bulk bar when rows are ticked, glass table (checkbox · custom columns · status switch · actions), edit sheet with sticky Cancel/Save footer, confirm sheet for destructive actions. |
| Image picker | `ImageField`: thumbnail + link input + **Choose from device** + Remove; `ImageListField`: thumbnails (first = Cover, ★ make cover, 🗑 remove) + upload + "paste link → Add". |
| Article layout | `BlogPost`: narrow (`max-w-3xl`) column, breadcrumb, byline + updated date + reading time, cover, TOC card, H2 sections with `scroll-mt-28`, glass table, FAQ cards, author card, disclaimer, CTA, related grid. |
| SEO content block | `ListingsSeoContent`: intro card → two-column localities table + budget links → FAQ cards → related-search chips, all under the results. |

## 5. Typography

- Display: `SF Pro Display` → `-apple-system` → `Inter` → `Segoe UI`.
- Text: `SF Pro Text` → same fallbacks.
- Headings use `letter-spacing: -0.02em`.
- Prices are the strongest element on a card; use `priceLabel` (`₹2.15 Cr`, `₹85,000/mo`).

## 6. Shape, spacing, motion

- Radii: `--radius-glass-sm 16px`, `md 22px`, `lg 28px`, `pill 999px`. Cards use md/lg; buttons and chips use pill or sm.
- Layout: max-width container, generous vertical rhythm between Home sections; 16px mobile gutters.
- Motion: framer-motion springs for hover/press/enter; `Reveal` for scroll; keep durations short; animate `transform` and `opacity` only.
- Rotating hero word + animated counters + soft `HeroBlobs` provide the Home hero's life without heavy color.

## 7. Layout patterns

**Public shell** — floating glass `Navbar`, optional `TopBanner` (40px, sets `--banner-h`), page content, `Footer`, floating `ContactRail` (Call + WhatsApp), `CompareBar` (sticky bottom when items selected).

**Panel shell** (`PanelShell`)
- Desktop: glass sidebar with nav + user card (links to the role's profile page).
- Mobile: floating **bottom tab bar** with the same nav icons (Profile included for both roles).

**Home hero** — a rounded (`32px`), padded, softly tinted panel (`--glass-surface` at 60%) with a 1px `--glass-border`; two blurred brand glows (accent top-left, accent-2 bottom-right) clipped by the panel; heading → sub-text → glass search card → type pills, all centred with `py-12 md:py-16`.

**Listings** — sticky filter sidebar (`md:sticky md:top-28 md:self-start` on the wrapper `<aside>`), results grid, sort, pagination.

**Property detail** — gallery → key facts → tabs (details / floor plan) → EMI calculator → map → Price Insight → Distance to Hubs → cross-link sections. Lead form sits in a sticky side column on desktop.

## 7a. Immersive layer

- **Mobile menu:** full-screen panel (`z-[80]`) sliding from the right on a spring; large 26 px links with a stagger, active link shows an accent dot, sub-menu chevron in a glass circle, sticky bottom action area (sign in / account, Call + WhatsApp, appearance). Page behind is frozen; backdrop dims/blur while it animates.
- **3D showcase:** two-column on desktop (copy left, rounded 32 px canvas right), stacked on mobile. Day gradient sky ↔ night gradient; warm window glow, fireflies at night; glass chip "Drag to look around", pill button "Day / Night". Hotspots are glowing accent-amber dots with pulse rings and a glass label card.
- **Cursor:** hero spotlight (radial accent glow at the pointer), card tilt ≤ 7° with a soft-light glare, and a 26 px accent ring that swells to 46 px over interactive elements.

## 8. Map design

- Custom **price-label pin** for the property (shows `priceLabel`), colored amenity markers by type.
- Street (OSM) / **Satellite** (Esri) toggle — satellite is default.
- Expand / collapse height, "Directions" deep-link to Google Maps, loading spinner tied to tile `load`.
- Dark theme: CSS filter on tile pane only.
- Zoom control and popups restyled to glass.

## 9. Forms & feedback

- Two-step OTP: details → four separate OTP boxes with auto-advance, backspace and paste support.
- Demo OTP is shown inline as "Demo mode — your OTP is XXXX" (transparent about the mock).
- Validation inline; required fields marked; success routes to `/thank-you`.
- Config cards in Admin Settings show a status badge and a clear "demo-only" note where relevant; secret fields are password inputs with an eye toggle.

## 10. Accessibility & responsiveness

- Text on glass must meet contrast in both themes — check `--text-secondary` on `--glass-surface`.
- Icon-only buttons need `aria-label`.
- Tap targets ≥ 44px on mobile.
- Breakpoints follow Tailwind defaults; design mobile first, then `md:` and `lg:`.
- Respect `prefers-reduced-motion` for large decorative motion where added.

## 11. Design checklist for new UI

- [ ] Uses tokens (no hardcoded brand hex)
- [ ] Uses glass primitives / existing components
- [ ] Hover, focus, pressed states
- [ ] Verified in light **and** dark
- [ ] Verified at mobile width
- [ ] No `position` utilities directly on `.glass` nodes
- [ ] Icons from `lucide-react`
