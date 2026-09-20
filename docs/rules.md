# Rules — NCR Estates

> Conventions and hard rules for anyone (human or AI) changing this codebase.
> Related: [prd.md](prd.md) · [architecture.md](architecture.md) · [design.md](design.md) · [tasks.md](tasks.md) · [memory.md](memory.md)

## 1. Data & domain

1. **India only.** Currency is ₹ (lakh / crore formatting). Use Indian cities, localities and phone formats. No USD or generic placeholder data.
2. **Public pages use filtered lists.** Use `activeProperties`, `approvedAgents`, `activeBlogPosts`, `activeFaqs`, `activeTestimonials` from `DataContext`. Raw `properties` / `agents` are for admin screens (and the single viewed-property lookup in `PropertyDetail`).
3. **Same-city comparisons only.** Any "vs average", estimate or insight feature compares within the same city (and same type when possible). If no local peer exists, **render nothing** — never fall back to a national / cross-city average.
4. **Users are keyed by `user.id` (or `user.phone`)**, never by email. Email is optional, legacy, display-only.
5. **Auth is phone + OTP.** No email/password paths.
6. **Never mutate seed JSON at runtime.** Store edits as overrides (see `re-user-overrides` / `withOverrides()` in `AuthContext`) or in persisted context state.
7. **Keep JSON shapes stable.** They are the contract for the future MongoDB API (see [architecture.md](architecture.md) §6). If a shape must change, update the docs and the CSV column list together.
8. Keep the property CSV schema (`PROPERTY_CSV_COLUMNS` in `src/utils/csv.js`) canonical. The template download must be generated from live seed data so it never drifts.

## 2. Integrations

1. **Real vs demo line:**
   - Meta Pixel and Google Ads = **real** (client-side).
   - WhatsApp Cloud API and SMTP = **demo-only** until a backend exists. Label them as such in the UI.
2. **Never call secret-bearing APIs from the browser** (WhatsApp token, SMTP password). Do not add a client-side email workaround (e.g. EmailJS) unless explicitly requested — SMTP via the future backend is the chosen path.
3. **Fire conversions via `useSettings().fireLeadEvent('<event_name>')`.** Never touch `window.fbq` / `window.gtag` from a component.
4. Inject third-party scripts with `document.createElement('script')`, not `innerHTML` / `dangerouslySetInnerHTML`.
5. Conversions fire **once per submission**, at submit time: property lead form, contact form and signup. `login` and `/thank-you` do not fire one (firing on both counted every lead twice).
6. Global contact details come from `SettingsContext` (`whatsappConfig.displayPhone`, `mailConfig.fromEmail`). Do not hardcode phone/email in components. Per-agent WhatsApp/phone links intentionally use the agent's own number.
7. Before using a free map-tile provider, verify it still works key-free.

## 3. Styling & UI

1. **Use tokens, not hex.** Use `--color-accent`, `--color-accent-2`, `--color-success`, `--color-danger`, `--color-warning`, `--bg-base*`, `--text-*`, `--glass-*`. Don't hardcode blue or introduce a third palette.
2. **New semantic colors need a light/dark pair**: light value in `:root`, dark value in `:root[data-theme="dark"]`, mirrored in the `prefers-color-scheme` block. Never reuse one value for both modes.
3. **Colors inside arbitrary Tailwind values must reference variables**, e.g. `shadow-[0_8px_24px_color-mix(in_srgb,var(--color-accent)_35%,transparent)]`. Never hardcode `rgba(...)` of a brand color.
4. **Exempt from re-theming:** success green, danger red, and third-party brand marks (WhatsApp `#25D366`). Those are the only allowed hardcoded colors.
5. **No colored gradient wash on `body`.** One soft accent glow only. Color belongs on buttons, badges, links, active states.
6. **`.glass` cascade rule:** never put `sticky`, `fixed`, `absolute`, or `hover:bg-*` utilities on an element that also has `glass` / `glass-strong` / `glass-weak`. Put position utilities on a plain wrapper; put hover styling in `index.css` with a more specific selector (`button.glass:hover`).
7. Sticky flex children need `self-start`.
8. Reuse the glass primitives (`GlassCard`, `GlassButton`, `GlassInput`, `GlassSheet`) — don't hand-roll new surfaces.
9. Every new interactive element needs a hover, focus and active/pressed state that works in **both** themes.
10. Test light and dark mode and a mobile width (360 / 390 px) for every UI change — `document.documentElement.scrollWidth` must equal `clientWidth` (no horizontal scroll).
11. **Mobile grids:** write `grid grid-cols-1 lg:grid-cols-3` (never a bare `lg:` grid) and add `min-w-0` to grid/flex children with long text, or the page scrolls sideways.
12. **CTA copy:** benefit-first, first-person, low-friction and honest — "Get My Free Callback", "Confirm & Book My Callback", "Create My Free Account" instead of "Send OTP" / "Verify & Submit". Add a one-line reassurance under the button (why we ask for the code, no spam, no obligation). No false urgency or scarcity ("only 2 left!") unless it is true.

## 4. React & code

1. Function components + hooks only. Match the surrounding file's style, naming and comment density.
2. **Key state-holding pages by route param.** Any `/entity/:id` page that holds local state must be keyed (`<Inner key={id} />`) or reset on id change.
3. Wrap every `localStorage` / `sessionStorage` access in `try/catch`; the app must render without storage.
4. New persisted state uses the existing `usePersistedState` helper and a `re-<name>` key. Document the key in [architecture.md](architecture.md).
5. Per-user features key off `user.id`; anonymous flows must still work (`userId: null`).
6. Leaflet: call `invalidateSize()` after any container size change.
7. Don't leave dead code, commented-out blocks, or unused state after a refactor (e.g. removing EmailJS meant removing package, util, config and UI together).
8. Comments explain **why** (gotchas, constraints), not what.
9. Lint must show **0 errors**: `npm run lint` (warnings are tolerated but shouldn't grow). Build must pass: `npm run build`.
10. **Never call `motion.create()` (or create any component) inside a render function.** Use `getMotionComponent()` from `components/glass/motionComponent.js`. Doing otherwise remounts the subtree every render (focus loss, dropped slider drags, reset state).

## 5. Routing & roles

1. Every role gets its own `<role>Nav` array in `App.jsx` and a `/<role>/profile` route rendering the shared `Profile.jsx` inside that role's shell.
2. Admin routes sit behind `ProtectedRoute requireAdmin`; `/admin` and `/dashboard` stay `Disallow`ed in `robots.txt`.
3. Bulk imports must show a per-row error review **before** committing.

## 6. SEO

1. **Every page renders `<Seo …/>`** with a unique title, description and `path` — including 404s and not-found states (`noindex`). Panels (`PanelShell`), `/thank-you`, `/compare`, and listing URLs with `q` / `maxPrice` / no results are `noindex`.
2. **Do not put `canonical`, `og:url` or `description` in `index.html`.** They duplicate Helmet's tags (a static `canonical="/"` once made every route point at the homepage).
3. Listing URLs: build them with `listingsPath()` (fixed key order, `encodeURIComponent`) so one filter combination = one canonical URL. The page number lives in the URL (`page=`), not in component state.
4. Headings for buying-intent pages come from `listingsHeading()` ("3 BHK Flats for Sale in Mumbai"). One `<h1>` per page.
5. Structured data: use the builders in `utils/seo.js` (Breadcrumb, FAQ, Person, Organization). Only mark up content that is visible on the page.
6. SEO copy on listing pages must be **computed from real inventory** (counts, price ranges, localities) — never hard-coded numbers.
7. The sitemap is generated (`npm run sitemap`); add new route families to `scripts/generate-sitemap.mjs`. Don't hand-edit `public/sitemap.xml`.
8. `meta keywords` is ignored by Google — put target keywords in the title, H1, first paragraph, headings and internal-link anchor text instead.

## 7. Process

1. **Research before big feature passes.** If the site feels incomplete vs. market sites, study 99acres / MagicBricks / NoBroker (and Zillow / Redfin for advanced ideas) first, then do a prioritised gap-fill.
2. **Verify in a browser** — not just a build — for anything visual or interactive. Use a throwaway test script (don't add test tooling as a dependency unless agreed).
3. Flag assumptions back to the user rather than silently guessing (e.g. adding an optional email field so an auto-reply is possible).
4. When a change touches a shared shape or pattern, update the docs in the same change.
5. Commits: small, imperative subject line; no unrelated files bundled.
6. **Backend phase:** default to MongoDB + Mongoose; mirror existing JSON shapes.

## 8. Do / Don't quick list

| ✅ Do | ❌ Don't |
|---|---|
| `activeProperties`, `approvedAgents` on public pages | Read raw `properties` / `agents` on public pages |
| `user.id` for ownership | Match by email |
| `color-mix(... var(--color-accent) ...)` | `rgba(10,132,255,…)` hardcoded |
| Wrapper div for `sticky` | `sticky` on a `.glass` node |
| `fireLeadEvent('name')` | `window.fbq(...)` in a component |
| Same-city price comparisons | National-average fallbacks |
| `try/catch` around storage | Assume `localStorage` works |
| Overrides for seed records | Mutating `users.json` at runtime |

## 9. Content & E-E-A-T

1. **Company facts come from `src/data/company.js` only.** Never hard-code the CEO name, years of experience, address, phone or RERA number in a component.
2. **Never invent facts.** No fake founding year, stats, awards, client counts, reviews, credentials or addresses. Unknown fields stay empty and their UI stays hidden.
3. **No fabricated testimonials.** Sample testimonials stay hidden (`showTestimonials: false`) until replaced with real, consented reviews. Don't use stock photos to stand in for real people (the CEO shows initials until a real photo is set).
4. Numbers on About / Home must be **computed** from data (live listings, cities, approved consultants, guides).
5. Claims must map to a real feature (agent approval, Verified badge, RERA number shown, same-city price insight). Don't promise "every listing RERA-checked" or "24x7 support" unless it is operationally true.
6. Legal / tax / finance articles: hedge ("varies by state", "confirm with…"), avoid quoting rates that change, always include the disclaimer, and show **published + updated** dates and the author.
7. Blog posts live in `src/data/blog.json`; add `related` slugs so posts interlink, and re-run `npm run sitemap`.

## 10. Admin-controlled content (no hard-coding)

1. **No page copy in components.** Text that a business owner might change lives in `src/data/siteDefaults.js` (or a collection) and is read via `useSettings().siteContent` / `company`. Wrap admin copy in `fill()` so `{brand} {ceoName} {ceoTitle} {years}` work.
2. **New content type = new collection**, not a JSON import: add it to `DataContext` with `makeCrud`, give it an `active` flag, add a `derived active list` for public pages, build the admin page with `CollectionAdmin` + a `schema`, and (when it makes sense) a CSV config in `utils/contentCsv.js`.
3. **Every managed item has `active`.** Treat `active !== false` as visible. Public pages must never read the raw list.
4. **Images: upload *or* link, always both.** Use `ImageField` / `ImageListField`. CSV import/export carries **links only** — uploaded (data:) images are exported blank and preserved on re-import.
5. **Never put a `data:` URL in meta tags, Open Graph or JSON-LD** — crawlers can't fetch it. Use `crawlableImage()`.
6. **Never render a bare `<img src="">`** (use `Avatar` or a placeholder) — browsers re-download the whole page.
7. Uploads are compressed to ≤1000 px JPEG; prefer links for production. Anything that can fail to persist must go through `usePersistedState` so the storage-full alert works.
8. CSV import must **preview before it changes anything**, list skipped rows with reasons, and update (not duplicate) rows whose id / slug already exists.
9. **Admin edits are per-browser until a backend exists.** Say so in UI copy; offer backup/restore; don't claim visitors see a change made in another browser.
10. **Generate files with the Write tool, not shell heredocs / `node -e` with template literals** — escapes like `\d` and backticks were silently mangled (a broken phone regex and a broken URL regex shipped from this).

## 12. 3D & cursor effects

1. **three.js is lazy.** Import 3D components only through `React.lazy`, mount them when near the viewport (IntersectionObserver), and stop the render loop when off-screen (`frameloop: 'never'`). Never import three at the top of an always-loaded file.
2. **Always ship a fallback**: no WebGL → message; runtime error → `SceneBoundary`; `prefers-reduced-motion` → no autorotate / pointer lean.
3. **Don't hijack scrolling.** Zoom is off; on touch the canvas uses `touch-action: pan-y` so vertical swipes scroll the page.
4. **Cursor effects are mouse-only** (`(hover: hover) and (pointer: fine)`) and skipped for reduced motion. They write styles straight to the DOM (no React re-render per move), never block clicks, and never hide the real cursor.
5. **Scene copy is admin-editable** (`siteContent.showcase`); the model itself is procedural — don't add heavy model files without agreeing a size budget.
6. **Full-screen overlays** (menu drawers, sheets) that must cover the screen go through a **portal** — an ancestor with `transform` turns `position: fixed` into "fixed to that ancestor".
7. Page lock for overlays = a class on `<html>` (`menu-open`) with `overflow: hidden`; don't use `position: fixed` on body (it fights scroll restoration).

## 11. Navigation, scroll & URL-driven inputs

1. **Every page change starts at the top.** `ScrollToTop` (mounted in `App.jsx`) resets scroll on each navigation, restores the old position on Back/Forward, and scrolls to #anchors. Don't add per-page `scrollTo` hacks.
2. **In-page navigations that only change filters must keep the scroll**: call `setSearchParams(next, { state: { keepScroll: true } })`. Pagination scrolls to the top itself.
3. **Never bind a text input straight to a URL param.** React Router applies URL updates in a transition, so fast typing dropped characters. Keep the text in local state and push it to the URL after a pause (`useUrlField` in `Listings.jsx`), using `replace` so typing doesn't spam history.
4. **Hero / feature blocks sit in a real panel**: rounded, padded, softly tinted (`rounded-[32px]`, `px-4 sm:px-8`, `py-12 md:py-16`). Decorative glows must be clipped by that panel (`overflow-hidden`) — a glow clipped by a bare section produced a hard rectangular edge. Brand colours only (accent / accent-2).

