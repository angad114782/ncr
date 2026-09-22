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

Three roles: **user** (client — the sign-up default), **agent**, **admin**. Landing page after sign-in: `panelPath(user)` (`/dashboard`, `/agent`, `/admin`).

1. Every role gets its own `<role>Nav` array in its `areas/<Role>Area.jsx` and a `/<role>/profile` route in that role's shell (the agent's profile page also holds the public agent profile).
2. Guard panels with `ProtectedRoute` (`requireAdmin` or `roles={['agent']}`); a signed-in user of the wrong role is sent to **their own** panel. `/admin`, `/agent` and `/dashboard` stay `Disallow`ed in `robots.txt`.
3. Bulk imports must show a per-row error review **before** committing.
4. **Each role has exactly one kind of door**, enforced in `AuthSheet`:
   - **Admin** cannot register or log in through any public form — the only admin account is the one `ensureAdmin()` creates for `ADMIN_PHONE`; `register`'s role is `z.enum(['user', 'agent'])` at the schema level, so `admin` cannot even be requested.
   - **Agent**: sign-up/login only from `source="list"` (the Home "List My Property" banner, the navbar/mobile-menu "Add Listing" button, `AgentRegisterCta` — all three call `openAuth('signup', 'list', 'agent')`). There is no buyer/agent switch anywhere else; a buyer number that logs in from this door is signed out again with a message.
   - **User**: every other door (navbar Sign In, `LoginNudge`, `WelcomeModal`, `RecommendedForYou`) is buyer-only — no way to pick "agent" there. An **agent** number that logs in from one of these doors is signed out again with a message pointing to the agent door.
   - Adding a new "become an agent" entry point means giving it `source: 'list'`, not a new switch.
5. **One phone-number flow, no login/sign-up choice.** `AuthSheet` has a single "Mobile Number" screen — never a login/sign-up tab or toggle. Sending the code tries `sendOtp(phone, 'login')` first; a 404 ("no account") silently falls back to `sendOtp(phone, 'register')` — the person never sees an error for this, the code is just sent either way. The OTP step then resolves itself: an existing number asks only for the code; a new number's OTP step *also* shows Name (+ City for the agent door) and the consent checkbox, so registration completes in the same step instead of a separate one. Never reintroduce a mode picker — if a new field is ever needed for sign-up, add it to the OTP step's `mode === 'signup'` block, not the phone step.
6. **`openAuth(mode, source, role, onSuccess)`'s 4th argument** is for "do something right here once signed in, don't redirect to a panel" (e.g. `hooks/useRevealPhone.js`) — `AuthSheet` calls it with the signed-in user and skips its normal panel redirect when it's set. Use it for any future "sign in to unlock this on the page I'm already on" flow instead of a bespoke redirect-and-come-back.

## 6. SEO

1. **Every page renders `<Seo …/>`** with a unique title, description and `path` — including 404s and not-found states (`noindex`). Panels (`PanelShell`), `/thank-you`, `/compare`, and listing URLs with `q` / `maxPrice` / no results are `noindex`.
2. **Do not put `canonical`, `og:url` or `description` in `index.html`.** They duplicate Helmet's tags (a static `canonical="/"` once made every route point at the homepage).
3. Listing URLs are **clean paths** (`/buy/mumbai/3-bhk`, `/rent/pune/villa`). Build every one with `listingsPath(filters, page)` from `utils/listingsUrl.js` — never hand-write `/listings?…` strings. One filter combination = one canonical URL; the page number is `?page=N` in the URL. Old `/listings?purpose=…` links redirect to the clean URL.
4a. **Property URLs use a readable slug**, not the id: `/property/riverside-4bhk-penthouse`. Build every link with `propertyPath(property)` (`utils/seo.js` → `propertySlug.js`) — never `/property/${p.id}`. The slug comes from the title; if it is taken the city, locality, type / purpose / BHK is added, then a number (`uniqueSlug`). It is generated by `DataContext` on **every** save path (admin form, agent form, CSV, duplicate, back-fill of old saved data) — don't set it by hand elsewhere. Old ids and old slugs keep working: `PropertyDetail` finds the listing with `findByParam` and redirects to the canonical slug URL; a renamed slug is remembered in `previousSlugs`.
4. Headings for buying-intent pages come from `listingsHeading()` ("3 BHK Flats for Sale in Mumbai"). One `<h1>` per page.
5. Structured data: use the builders in `utils/seo.js` (Breadcrumb, FAQ, Person, Organization). Only mark up content that is visible on the page.
6. SEO copy on listing pages must be **computed from real inventory** (counts, price ranges, localities) — never hard-coded numbers.
6a. **The site positions itself as NCR-first, not pan-India** (decided 2026-09-22, after an SEO review flagged the mismatch: domain `propertyinncr.com` + brand "NCR Estates" vs. a homepage pitching "Across India" while the actual inventory was thin and scattered across 7 cities). `src/data/taxonomy.js`'s `DEFAULT_CITIES` lists Gurugram, Noida, Delhi, Ghaziabad, Faridabad **first**, other cities after — that order drives the homepage "Explore by city" grid and (via `landingCombos()`) which city gets top billing once it has real listings. Homepage/Agents/About/Contact/Team copy and meta descriptions say "in Delhi NCR — and other major Indian cities", not "across India". **Adding a city to the list never fabricates content for it** — `landingCombos()` only builds a page once that city has at least one real listing (§11 below), and `ExploreCities` shows the honest count (including 0) rather than hiding an empty city. Don't remove the non-NCR cities or their listings — they're real; just don't make them the headline. A generic cross-city list (e.g. "more of this property type") uses non-geographic wording rather than claiming either "India" or "NCR" for content that isn't scoped to either.
7. `sitemap.xml`, `llms.txt`, `llms-full.txt` and `feed.xml` are **generated** (`npm run seo`, also run by `npm run build`) from the same data and the same `landingCombos()` the site uses. New route families go in `scripts/site-data.mjs` `getRoutes()`. Don't hand-edit those files in `public/`.
8. `meta keywords` is ignored by Google — put target keywords in the title, H1, first paragraph, headings and internal-link anchor text instead.
9. **`.jsx` vs `.tsx` is irrelevant to SEO.** What matters is that crawlers get real HTML: every public URL is **pre-rendered** at build (`npm run build` → `dist/<route>/index.html`). Keep it that way — see §13.
10. **Internal links are real anchors.** Anything that goes to another public page is a `<Link to>` (or `GlassButton as={Link} to=…`), never `onClick={() => navigate()}` — bots do not click buttons. `navigate()` is for post-submit redirects and filter changes only.
11. **Only link to pages that exist and have content.** Landing-page links come from `landingCombos()` (combinations with at least one listing); empty combinations are not linked, not in the sitemap, and render `noindex`.
12. **Dynamic interlinking:** blog / FAQ text goes through `AutoLinkedText` / `BlogBody` (admin rules in Site Content → *SEO & links* + city names). Every article shows related guides (`relatedPosts`) and `ExploreLinks`; listing pages show `ExploreLinks` + `GuideLinks`; `/sitemap` lists everything. A new page must be reachable from at least one of these.
13. **AIO / GEO:** every guide has a **Quick answer** (`summary`, 40–60 words, answer first) — rendered in a `data-speakable` box, exposed as `abstract` + `speakable` in JSON-LD, and copied into `llms-full.txt`. Keep `robots.txt` open to AI crawlers (GPTBot, ClaudeBot, PerplexityBot …) unless the owner opts out. Author, updated date and CEO credentials (E-E-A-T) stay visible on articles.
14. Pages that must not be indexed (search text, price caps, empty results, panels) use `noindex, follow` — bots still follow their links.
15. **NAP (Name, Address, Phone) must be real and visible**, not buried — Google Business Profile checks that the number it has on file matches what a visitor (and its own crawler) actually sees on the website, ideally without scrolling. The one number is `whatsappConfig.displayPhone` (Admin → Settings → WhatsApp → *Display Phone Number*) — it drives the header `tel:` link (`Navbar.jsx`, desktop only, `lg:` breakpoint), the footer, the mobile menu's Call/WhatsApp buttons, and the `telephone` field in `organizationLd()`'s JSON-LD. Change it in one place, not four. Every one of those is guarded to render nothing (not a broken `tel:+91` with no digits) when it's empty — that's the tell that it still needs to be filled in, not a bug to "fix" by hard-coding a number.

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
7. Blog posts live in `src/data/blog.json`; add `related` slugs so posts interlink, and rebuild (`npm run build`) so the page is pre-rendered and added to the sitemap / llms.txt.

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
2. **In-page navigations that only change filters must keep the scroll**: `navigate(url, { state: { keepScroll: true } })` / `<Link state={{ keepScroll: true }}>`. Pagination links scroll to the top themselves (`scrollToY(0)`).
3. **Never bind a text input straight to a URL param.** React Router applies URL updates in a transition, so fast typing dropped characters. Keep the text in local state and push it to the URL after a pause (`useUrlField` in `Listings.jsx`), using `replace` so typing doesn't spam history.
4. **Hero / feature blocks sit in a real panel**: rounded, padded, softly tinted (`rounded-[32px]`, `px-4 sm:px-8`, `py-12 md:py-16`). Decorative glows must be clipped by that panel (`overflow-hidden`) — a glow clipped by a bare section produced a hard rectangular edge. Brand colours only (accent / accent-2).

## 13. Pre-rendering & hydration (SEO-critical)

1. **Build = 4 steps**: `seo` (sitemap / llms / feed) → `vite build` (client) → `vite build --ssr` (`src/entry-server.jsx`) → `scripts/prerender.mjs` (writes `dist/<route>/index.html`; fails the build if a page lacks exactly one `<h1>`, a `<title>`, a canonical or a description).
2. **First client render must equal the server render.** `usePersistedState` therefore returns the *defaults* on its first render and loads `localStorage` in a layout effect (`ready` flips true afterwards). Never read `localStorage`, `window`, `new Date()` or `Math.random()` while rendering — do it in an effect, or add `suppressHydrationWarning` for values that legitimately differ (the footer year).
3. Anything guarded by login state waits for `ready` (`ProtectedRoute`) so a reload never bounces the admin to `/`.
4. **Heavy / browser-only code is lazy**: Leaflet (`PropertyMap`, with a crawlable text placeholder), three.js (`HouseScene`), and the whole admin + dashboard (`AdminArea`, `DashboardArea`). Don't import them from a public page's top level.
5. **Render must be pure.** Don't mutate shared state while rendering (React renders twice in dev / StrictMode). The auto-linker uses a claims `Map` keyed by text id for exactly this reason.
6. New public route ⇒ add it to `App.jsx` **and** `scripts/site-data.mjs`, run `npm run build`, and check the page exists in `dist/`.
7. Build-script modules that the app also imports (`listingsUrl.js`, `format.js`, `taxonomy.js`) must have **no extensionless local imports** — Node ESM can't resolve them.
8. **Deploy requirement**: nginx must serve `try_files $uri $uri/ /index.html;` (see `deploy/nginx.example.conf`) or crawlers get the empty shell. Verify: `curl -A Googlebot https://propertyinncr.com/about | grep "<h1"`.

## 18. API mode & deployment

1. Everything that reads or writes data goes through the contexts, which work in **both** modes (`USE_API`). Don't call `localStorage` or `fetch` from a page — add it to the context (or `src/api/client.js`) so both modes stay in step.
2. The first render never depends on a fetch (hydration): start from the snapshot / defaults, load in an effect.
3. Errors from a background save are shown with `reportApiError` (toast) and the list is re-read — never swallow them.
4. A server rule and its screen message should agree; the server is the authority (the page's own check is only a courtesy). Roles, ownership, review status, slugs and intent are decided on the server.
5. Images are uploaded (`/api/uploads`) and stored as `/uploads/…` links — never data URLs.
6. Deploy = push to `main` (tests → backend → website → nginx). Secrets live in `backend/.env` on the server, never in git or workflow logs. Don't add a step that touches `dist/` before the release has succeeded.
7. **Live updates are push, not poll.** A mutation that should be visible elsewhere without a refresh calls `broadcast(scope, event, data)` (`backend/src/lib/events.js`) — reuse `contentChanged()`'s automatic `'admin'`/`'public'` broadcast for ordinary content changes; add a specific `broadcast()` call only for something time-sensitive with its own payload (a new lead, a listing's review status — see `services/leads.js`, `routes/admin-properties.js`). The frontend side is one `EventSource` in `DataContext` (API mode only) that calls the existing `load()` on the named events — add a new *kind* of live update by listening for its event name there, not by opening a second connection. See `docs/architecture.md` for the scope model and its one real limitation (single Node process).

## 14. Performance & smooth scrolling

1. Images go through `<Img>` (`components/common/Img.jsx`): responsive `srcset` for Unsplash links (`utils/imageUrl.js`), `loading="lazy"` + `decoding="async"`, and `width`/`height` to stop layout shift. Give the one above-the-fold (LCP) image `priority`.
2. Below-the-fold home sections use `Reveal` (`content-visibility: auto`), which also skips layout/paint until they are near the viewport.
3. Smooth scrolling is **Lenis** (`utils/smoothScroll.js`, mounted as `<SmoothScroll/>`): desktop mouse only, off for `prefers-reduced-motion`, off in `/admin` and `/dashboard`, started when the browser is idle. Anything that scrolls by itself (dialogs, textareas, selects, maps, `overflow:auto` containers) is left alone automatically; add `data-lenis-prevent` to a custom scroller if needed.
4. Route changes always jump instantly (`scrollToY(0, { immediate: true })`); never call `window.scrollTo` directly in components — use `utils/smoothScroll`.
5. New heavy dependency? Make it a lazy chunk and check the `npm run build` output. Main bundle target: stay near ~115 kB gzip.

## 15. Personalisation, login prompts & lead capture

1. **Never wall content behind a login.** Pages stay open (visitors and Googlebot). Sign-up is invited at moments of real interest — viewed 2+ homes, a search, a saved home — through `LoginNudge`, `RecommendedForYou` and the sign-up sheet. The one modal allowed is the dismissible `WelcomeModal` (welcome on arrival, "before you go" on exit intent): centered card, delayed, once per browser session, never for signed-in visitors, crawlers, `/contact`, panels or legal pages, and it must always be closable. Keep it that way — Google penalises intrusive full-screen interstitials.
2. **Behaviour is recorded on the visitor's own device** (`re-interest`, `InterestContext`, pure logic in `utils/interest.js`): views, searches, saves, compares, visits → focus (city / type / BHK / purpose), rough budget and a Hot / Warm / Cold intent. Add new signals in `interest.js` (`recordEvent`, `summarise`), not ad-hoc in pages. Call `track('view' | 'search' | 'save' | 'compare', property)` from the interaction.
2a. **A signed-in account's history is also kept server-side, for admin.** The same `track()` calls batch to `POST /api/me/events` (API mode, `requireAuth`), which stamps each event with the caller's IP and a best-effort city/region/pincode (`backend/src/lib/geo.js` — free lookup, cached, never blocks or throws on failure). Admin → Users → a row's click (`UserActivitySheet.jsx`, `GET /api/admin/users/:id/activity`) shows that one account's full history, newest first — every view, search, save and compare, with an explicit "estimate, not exact" note on the location. **This never extends to anonymous visitors** — an anonymous visitor's behaviour (point 2, above) stays on-device only; the server-side timeline is only ever written for a signed-in, consenting account. Admin → **Search Analytics** (`GET /admin/analytics/searches`, §8e) aggregates the same `search` events across everyone — it inherits the identical limitation (signed-in accounts only) and must keep saying so (`signedInOnly: true`) rather than being shown as total site traffic.
3. **A lead is created only from a verified number that agreed.** Sign-up requires the **unticked consent checkbox** (`nudge.consentText`) and a link to `/privacy`; the lead stores `consent: true`, `source` (`signup` / `signup-prompt`), `intent` and a compact `interest` object (`leadInterest()` — no raw history, no secrets).
4. **Ad platforms get context, never identity**: `fireLeadEvent(name, { city, property_type, intent })` — never a name, phone or e-mail.
5. **Only promise what the team does.** Benefit text is admin-editable (Site Content → *Login prompt*). Don't add "instant alerts", "synced on all devices" etc. until they exist.
6. **The prompt must stay polite**: delay first, once per session, never on `/admin`, `/dashboard`, `/contact`, `/thank-you`, `/compare`, `/privacy`, never for signed-in users, stays away for `cooldownDays` after "Not now" (×4 the second time), no fake scarcity or countdowns, always dismissible.
7. Anything derived from the visitor's profile renders **nothing on the server and on the first client render** (profile starts empty) so hydration matches; `RecommendedForYou` returns `null` until there is a signal.
8. Until the backend exists, leads live in the visitor's browser and do **not** reach the admin. When the API arrives, post the same lead payload from `AuthSheet` / `LeadForm` (`addInquiry` is the seam).

## 16. Legal pages, agents & moderation

1. **Legal text is admin data, never hard-coded.** `/privacy`, `/terms`, `/disclaimer` render `siteContent.legal.<kind>` (defaults in `src/data/legalDefaults.js`, edit in Admin → Site Content → Privacy Policy / Terms & Conditions / Disclaimer). A section body is plain text: blank line = paragraph, `- ` lines = bullets; tokens `{brand} {email} {phone} {ceoName}`. Bump *Last updated* when the text changes. The defaults are a starting point — **a lawyer must review them** before real customer data or real listings.
2. Every place that collects data links to the legal pages: the sign-up sheet (consent checkbox + Terms + Privacy links) and the footer. Keep it that way for new forms.
3. **Agent sign-up only happens at the agent door** (`source="list"` — see §5.4); agent fields (city, agency, RERA) render whenever that door is used. Admin can switch the whole program off (Site Content → Agent program).
4. **An agent registers as pending.** Sign-up creates the login (`role: 'agent'`) **and** an agent record (`status: 'pending'`, `userId`, `agency`, `reraId`). Public pages use `approvedAgents` only, so nobody sees a pending agent. The admin approves in Admin → Agents.
5. **Agent-posted listings are moderated.** An agent's listing is always saved as `reviewStatus: 'pending'`, `active: false`, stamped with `agentId` + `submittedBy`; only the admin's approval makes it live (`reviewStatus: 'approved'`, `active: true`) — and only if the agent is approved. `activeProperties` requires `reviewStatus` to be `approved` (missing = approved, so admin-created / seed listings are unaffected). Rejecting stores an optional `reviewNote` shown to the agent; editing a rejected listing resubmits it.
6. **An agent can only touch their own listings and enquiries** (`agentId` match). They cannot set Featured / Verified / Active, change the listing agent, or see other agents' data. This is enforced in `AgentListings` today and **must be enforced again on the server** (see architecture §8a).
7. New agent-visible screens live in `src/pages/agent/`; reuse the shared listing editor (`components/admin/listingForm.js`, `propertyCsv.js`) instead of copying the form.

## 17. Property URL slugs

1. One source of truth: `src/utils/propertySlug.js` (dependency-free, shared with the build scripts). `resolveSlug(item, list)` on save, `ensureSlugs(list)` for old data, `findByParam(list, segment)` on the public page, `propertyPath(p)` for links.
2. A slug is stable: editing the title does **not** change it. The admin can type a new one (Listings → URL slug) or clear it to regenerate; the old one is pushed to `previousSlugs` and redirects. An agent has no slug field — it is generated and kept.
3. A slug must be unique across slugs, old slugs **and ids** (so `/property/p6` is never ambiguous). The admin form rejects a typed slug that is taken; automatic slugs never collide, even for several rows of one CSV.
4. The sitemap, `llms-full.txt`, JSON-LD and canonical all use the slug URL. The build also writes a small redirect page for every old `/property/<id>` (`dist/property/<id>/index.html`, canonical + instant refresh) and `dist/property-redirects.map` for real 301s in nginx (see `deploy/nginx.example.conf`).
5. Seed listings in `src/data/properties.json` carry a `slug`; add one (or run the seed through `ensureSlugs`) when adding a seed listing.

## 19. Abuse protection (backend)

1. **The escalating IP/phone block ladder** (`backend/src/lib/security-block.js`): a rate limit trip on login/sign-up (`authLimiter`) or a public form (`leadLimiter`), or a phone that keeps requesting an OTP and never verifies (`otp_never_verified`, checked in `services/auth.js#issueOtp`), escalates that IP or phone — **24h → 48h → 7 days → permanent**. `ipBlockGuard` / `phoneBlockGuard` turn a currently-blocked key away with `403 blocked` before the route runs. Give a new public-facing, unauthenticated POST route the same two guards + a limiter with a `reason` (see `authLimiter`/`leadLimiter` in `middleware/index.js`) if it can be spammed.
2. **The admin account is exempt, always.** `isExempt()` in `security-block.js` checks `value === config.adminPhone`; never remove that check, and never make the ladder apply to a route only admin can reach.
3. **Every block is reversible.** Admin → Security (`GET/POST /admin/security/blocks*`) lists and clears blocks — a shared IP or a reassigned number can be caught by mistake, and there is no other way to undo a permanent block.
4. This stops one abusive IP or number; it is not a defense against a distributed attack (many IPs), which needs infrastructure in front of the VPS (e.g. Cloudflare), not application code. CORS/`originGuard` stop a *browser* from using this site's cookies against the API from another origin — they do nothing against a non-browser client (curl, another server), which no server-side code can prevent.

## 20. Reviews (agent + property)

1. **`Review` is not `Testimonial`.** `Testimonial` is admin-authored home-page copy (Admin → *Reviews*, confusingly — that name predates this feature). `Review` (`backend/src/models/index.js`) is a real signed-in person's rating + text for one agent or one property, submitted from the public site (`POST /me/reviews`) — never typed in by the admin. Don't merge the two models or reuse one's admin screen for the other.
2. **Nothing is public until the admin approves it** — same idea as Testimonials, applied to user-submitted content instead of admin-authored content. A review starts `pending`; only `status: 'approved'` rows are ever returned by `GET /reviews` (the public endpoint). Moderate at Admin → **Ratings & Reviews** (`/admin/ratings` — a different page from Admin → *Reviews*, which is Testimonials).
3. **One review per person per target.** Submitting again (`POST /me/reviews` for the same `targetType`+`targetId`) replaces the old rating/text and puts it back to `pending` — admin sees the current version, never a stale approved one sitting next to an edited draft.
4. **No self-reviews.** Reviewing your own agent profile, or a property you (as an agent) posted yourself, is refused server-side (`routes/me.js`) — a rating only means something if it's from someone else.
5. **Writing a review needs a sign-in**, same one-flow pattern as `useRevealPhone` (§ phone reveal, `hooks/useReviews.js`): the visitor can fill in the stars and text first; only on Submit, if they're signed out, does `AuthSheet` open (via `onSuccess`), and the review is sent the moment sign-in succeeds — they never lose what they typed.
6. **Account erasure keeps the rating and text, but not the name** (`DELETE /me`): `Review.userName` becomes "Deleted user" and `userId` is cleared, same treatment as an erased person's leads. The feedback about the agent/property is real and stays; the identity doesn't.
7. Not wired to WhatsApp: unlike a lead, a new review does not trigger the `lead_notification` template (its variables — budget, property link, callback number — don't fit "someone left a review"). Admin sees new reviews the same way pending agent listings already work: **live in the panel** (`broadcast('admin', 'review:new', …)`, plus the pending count on Admin → Ratings & Reviews), not by WhatsApp. Revisit only if that turns out not to be enough in practice.

## 21. Masked contact info: gate every href, not just the visible text

Masking a phone number in what a visitor *reads* (`useRevealPhone`'s `91XXXXXXX667`) does nothing if the real
number is still sitting in an `href` on the same page — `tel:`, `mailto:`, and especially `wa.me/91<number>`
links carry the full number in plain text in the page's HTML. Anyone can read it with "View Page Source" (never
blockable) without ever opening DevTools, and a `wa.me` link *opens WhatsApp chatting that real number* the
moment it's clicked, regardless of what text is shown next to it. **Trying to block DevTools / right-click /
F12 does not fix this and isn't attempted here** — it's trivially bypassed (View Source, a different browser,
curl, disabling the blocking script itself), breaks legitimate use (accessibility tools, the person's own
review of their own site), and doesn't touch the actual leak. The real fix: **every link that would embed the
masked value must be gated exactly like the visible text is** — build the `href` only after `revealPhone.revealed`
is true (see the agent's "Chat on WhatsApp" button on `PropertyDetail.jsx`, gated the same way as its Call
button); before that, render a button that calls the same `onReveal()`. Apply this to any *future* masked field
too (an email, a second number) — the rule is the mask and the link must reveal together, never one without the
other.
