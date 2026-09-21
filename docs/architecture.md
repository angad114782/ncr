# Architecture — NCR Estates

> How the system is built. Related: [prd.md](prd.md) · [design.md](design.md) · [rules.md](rules.md) · [tasks.md](tasks.md) · [memory.md](memory.md)

## 1. Stack

| Layer | Choice |
|---|---|
| Build / dev | Vite 8 |
| UI | React 19 (function components + hooks) |
| Routing | react-router-dom 7 (`BrowserRouter` in the browser, `StaticRouter` when pre-rendering) |
| Rendering | Vite SPA **pre-rendered to static HTML** at build (`react-dom/static` `prerender`), hydrated with `hydrateRoot` |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) + custom CSS tokens in `src/index.css` |
| Animation | framer-motion 13 |
| Icons | lucide-react |
| Maps | leaflet + react-leaflet 5 |
| 3D | three + @react-three/fiber 9 + @react-three/drei 10 (lazy chunk; requires React 19.2.x) |
| CSV | papaparse |
| SEO | react-helmet-async (+ generated sitemap / llms.txt / feed) |
| Smooth scroll | lenis (lazy chunk, desktop only) |
| Lint | oxlint |
| Data (now) | Static JSON in `src/data/` + `localStorage` |
| Data (planned) | Node + Express + **MongoDB (Mongoose)** |

Scripts: `npm run dev` · `npm run build` (seo → client → ssr → prerender) · `npm run seo` · `npm run preview` · `npm run lint`.

## 2. Folder structure

```
ncr/
├─ docs/                     ← this documentation
├─ public/                   ← favicon, robots.txt; sitemap.xml, llms.txt, llms-full.txt, feed.xml (generated)
├─ scripts/                  ← site-data.mjs (route list), generate-seo-files.mjs, prerender.mjs
├─ deploy/nginx.example.conf ← try_files for pre-rendered pages, gzip, asset caching
├─ index.html                ← no canonical/description here (each page sets its own)
├─ vite.config.js
└─ src/
   ├─ main.jsx               ← HelmetProvider + <App/>
   ├─ App.jsx                ← providers + all routes + panel nav arrays
   ├─ index.css              ← design tokens, .glass primitives, leaflet theming
   ├─ hooks/                 ← usePersistedState (deep-merge defaults, quota-error reporting)
   ├─ context/               ← global state (Theme, Auth, Data, Settings)
   ├─ data/                  ← seed JSON: properties, agents, users, inquiries,
   │                           testimonials, faqs, landmarks, blog.json
   │                           + company.js (CEO / company facts, single source of truth)
   ├─ utils/                 ← csv.js, geo.js, tracking.js, seo.js (JSON-LD builders,
   │                           listingsPath, listingsHeading), listingsSeo.js, blog.js
   ├─ components/
   │  ├─ glass/              ← GlassButton, GlassCard, GlassInput, GlassSheet,
   │  │                         ThemeToggle, Reveal, motionComponent.js (cached motion.create)
   │  ├─ admin/              ← CollectionAdmin, SchemaForm, CsvToolbar, ImageField(+List), BlogBodyEditor, Toggle
   │  ├─ blog/               ← BlogBody (markup renderer)
   │  ├─ three/              ← HouseScene (procedural 3D home; lazy)
   │  ├─ effects/            ← Tilt (cursor 3D tilt + glare), CursorFollower (ring)
   │  ├─ common/             ← Avatar
   │  ├─ company/            ← CeoAvatar (photo if set, else initials)
   │  ├─ listings/           ← ListingsSeoContent (localities, budgets, FAQs, related links)
   │  ├─ layout/             ← Navbar, Footer, PublicLayout, PanelShell,
   │  │                         ProtectedRoute, AuthSheet, ContactRail,
   │  │                         TrackingScripts, TopBanner, Seo
   │  ├─ home/               ← Home page sections
   │  └─ property/           ← PropertyCard, PropertyMap, LeadForm, EMICalculator,
   │                            PriceInsight, DistanceToHubs, Lightbox, CompareBar, …
   └─ pages/
      ├─ public/             ← Home, Listings, PropertyDetail, Agents, AgentProfile,
      │                         About, Team, Contact, Blog, BlogPost, Compare,
      │                         ThankYou, NotFound
      ├─ dashboard/          ← DashboardHome, Saved, MyInquiries, Profile
      └─ admin/              ← AdminHome, ManageListings, ManageUsers,
                                ManageInquiries, AdminSettings
```

## 3. Provider tree

```
<HelmetProvider>
  <ThemeProvider>          data-theme on <html>, key re-theme
    <AuthProvider>         user, allUsers, login/signup by phone, updateProfile
      <DataProvider>       properties, agents, inquiries, saved, compare, recent
        <SettingsProvider> contact info, integrations, cities, types, top banner
          <BrowserRouter>
            <TrackingScripts/>   ← loads pixels, fires page views on route change
            <Routes/>
```

## 4. Routing

| Shell | Guard | Routes |
|---|---|---|
| `PublicLayout` | none | `/privacy`, `/terms`, `/disclaimer` (admin-editable legal pages), `/`, `/listings`, `/buy`, `/buy/:a`, `/buy/:a/:b`, `/rent`, `/rent/:a`, `/rent/:a/:b` (clean listing URLs, §4a), `/sitemap`, `/property/:slug` (also accepts an old id / old slug and redirects — §4d), `/agents`, `/agents/:id`, `/about`, `/team`, `/blog`, `/blog/:slug`, `/contact`, `/compare`, `/thank-you`, `*` (404) |
| `PanelShell` "Dashboard" | `ProtectedRoute` (any logged-in user) | `/dashboard`, `/dashboard/saved`, `/dashboard/inquiries`, `/dashboard/profile` |
| `PanelShell` "Agent Panel" | `ProtectedRoute roles={['agent']}` | `/agent`, `/agent/listings`, `/agent/leads`, `/agent/profile` |
| `PanelShell` "Admin Panel" | `ProtectedRoute requireAdmin` | `/admin`, `/admin/listings`, `/admin/users`, `/admin/inquiries`, `/admin/settings`, `/admin/profile` |

`/dashboard/*`, `/agent/*` and `/admin/*` are `React.lazy` chunks (`src/areas/`), so visitors and crawlers never download them.

`/admin/profile` and `/dashboard/profile` render the **same** `Profile.jsx` but in their own shell (so title + active-tab highlight stay correct). A new role should follow the same pattern.

## 4a. Pre-rendering, clean URLs & crawlability

```
npm run build
 ├─ scripts/generate-seo-files.mjs   public/sitemap.xml · llms.txt · llms-full.txt · feed.xml
 ├─ vite build                       dist/  (client bundle + index.html template with head markers)
 ├─ vite build --ssr src/entry-server.jsx  →  dist-ssr/entry-server.js   (render(url) → HTML)
 └─ scripts/prerender.mjs            dist/<route>/index.html for every route in scripts/site-data.mjs
```

- `scripts/site-data.mjs` `getRoutes()` — the single list of public URLs (static pages, `landingCombos()` category pages, posts, properties, agents). The sitemap, `llms.txt` and pre-rendering all use it.
- `src/utils/listingsUrl.js` — dependency-free `listingsPath()`, `resolveListingsSegments()`, `landingCombos()`; imported by the app and the Node scripts.
- **Clean listing URLs**: `/buy|rent[/{city}][/{type | N-bhk}]`; possession / `beds` (with a type) / `page` / `q` / `maxPrice` stay in the query string (`q` and `maxPrice` pages are `noindex`). Unknown segment → 404 page. `/listings?purpose=…` redirects to the clean URL.
- **Interlinking**: `AutoLinkedText` + `BlogBody` (admin keyword rules + city names, once per page), `relatedPosts()`, `ExploreLinks`, `GuideLinks`, `PopularSearches`, footer, and the `/sitemap` HTML page. All are `<a href>` links present in the prerendered HTML.
- **AIO / GEO files**: `public/llms.txt` (curated map), `llms-full.txt` (site text incl. blog Quick answers), `robots.txt` (AI crawlers allowed), `feed.xml` (RSS). Blog JSON-LD carries `abstract` + `speakable`; `<Seo>` emits `hreflang en-IN / x-default` and `og:locale en_IN`.
- **Deploy**: `deploy/nginx.example.conf` (`try_files $uri $uri/ /index.html`, gzip, immutable `/assets` cache).

## 4b. Personalisation & sign-up flow

```
visitor clicks (PropertyDetail / Listings / PropertyCard) ─▶ InterestContext.track()  ─▶ localStorage 're-interest'
                                                              │
                            summarise() ─▶ { focus, budget, intent, score }
                              ├─ LoginNudge          soft card after real interest (admin: Site Content → Login prompt)
                              ├─ RecommendedForYou   "Picked for you" home section (matchScore)
                              └─ AuthSheet (signup)  benefits + consent checkbox ─▶ addInquiry({ source, consent, intent, interest })
                                                                                  └▶ fireLeadEvent('signup', { city, property_type, intent })
```
`/privacy` explains all of this (DPDP Act 2023). Admin → Inquiries shows the intent badge, a *Hot leads* filter and the consent note; the CSV export has `source, intent, interest, consent`.

## 4c. Agents & moderation

```
Sign-up sheet (AuthSheet)  ─ "I'm an agent" ─▶ signupWithPhone(role:'agent') + agentCrud.upsert({status:'pending', userId, agency, reraId})
                                               └▶ /agent  (Agent Panel: banner "waiting for approval")
Agent Panel → My listings (CollectionAdmin + listingForm, guarded crud) ─▶ property { agentId, submittedBy, reviewStatus:'pending', active:false }
Admin → Agents  ✓ approve agent          Admin → Listings  "Pending review (n)" ✓ approve (needs approved agent) / ✗ reject (+ note)
                                                               └▶ property { reviewStatus:'approved', active:true }  ─▶ public site
Enquiries on an agent's property ─▶ Agent Panel → Enquiries (only their own listings)
```
Shared pieces: `components/admin/listingForm.js` (fields / defaults / prepare, `mode: 'admin' | 'agent'`), `components/admin/propertyCsv.js`, `CollectionAdmin` props `extraFilters` and `rowExtras(item, { flash })`, `pages/agent/useMyAgent.js` (agent record + own listings + own leads; creates a pending agent record for an admin-made agent user).

## 4d. Property slugs

`/property/:slug` — the segment is the listing's `slug` (from its title; city / locality / type added if taken), an old slug (`previousSlugs`) or an old id. `PropertyDetail` resolves it with `findByParam` and `<Navigate replace>`s to `propertyPath(property)` when it isn't the canonical slug. `DataContext.propertyCrud.upsert / upsertMany` stamp the slug (through a ref, so a CSV of same-title rows gets distinct slugs) and back-fill older saved data on load. The prerender writes redirect pages for old ids and `dist/property-redirects.map` (nginx 301 map).

## 5. State & persistence

All state lives in React context and is mirrored to `localStorage` under `re-*` keys. `usePersistedState` renders the **defaults first** and loads the saved value in a layout effect (so the server-rendered HTML and the first client render match); it returns `[value, set, ready]`.

| Context | Keys | Contents |
|---|---|---|
| Theme | `re-theme` | `light` / `dark` |
| Interest | `re-interest`, `re-nudge`, sessionStorage `re-visit-counted` / `re-nudge-shown` | per-visitor browsing profile (views / searches / saves / compares) and login-prompt cooldown — see [rules.md](rules.md) §15 |
| Auth | `re-user`, `re-extra-users`, `re-user-overrides` | current user; runtime signups; per-id patches over seed users |
| Data | `re-properties`, `re-inquiries`, `re-saved`, `re-compare`, `re-recent`, `re-agents`, `re-blog`, `re-faqs`, `re-testimonials` | domain data + user-scoped lists |
| Settings | `re-whatsapp-config`, `re-mail-config`, `re-marketing-config`, `re-cities`, `re-property-types`, `re-top-banner`, `re-ticker`, `re-company`, `re-site-content` | admin-managed config & page copy |
| TopBanner | `re-banner-dismissed` | per-visitor: exact banner text dismissed |

### Derived lists (important)
`DataContext` exposes both raw and **filtered** collections:

- `properties` / `agents` — raw, **admin surfaces only**.
- `activeProperties` (`active !== false`) and `approvedAgents` (not `pending` / `rejected`) — **every public page must use these**.

`PropertyDetail` deliberately looks the *viewed* property up in raw `properties` so a direct link doesn't 404, then shows a `noindex` "no longer available" state when `active === false`. `AgentProfile` now uses `approvedAgents` (pending/rejected agents 404).

> Still reading raw lists (known issue, see [tasks.md](tasks.md)): `Compare`, `CompareBar`, `Saved`, `DashboardHome`, `PriceInsight`, and `PropertyDetail`'s agent lookup.

### Seed-user overrides
Seed JSON is imported statically and can't be mutated. Edits to seed records are stored as a patch (`re-user-overrides`, keyed by id) and merged on read (`withOverrides()`). Use this pattern for any "edit a seed record" feature.

## 6. Data model (shapes the future MongoDB schema must match)

**Property** (`src/data/properties.json`)
```
id, slug, previousSlugs?, title, type, purpose("Buy"|"Rent"), price(number), priceLabel("₹2.15 Cr"),
city, locality, address, lat, lng, beds, baths, areaSqft, furnishing, yearBuilt,
agentId, featured, verified, reraId, possessionStatus, videoTour, videoUrl?, postedDate,
description, active?, images[], floorPlans[], amenities[], nearby[{type,name,distance}]
```
**Agent** — `id, name, role, city, phone, email, avatar, rating, dealsClosed, status("approved"|"pending"|"rejected"), bio, active` and, for self-registered agents, `userId, agency, reraId, joined` (a rating / deals of 0 is hidden on public pages)
**User** — `id, name, phone (auth key), email? (legacy, display only), role("user"|"agent"|"admin"), city, active?, agentId? (agents only)`
**Inquiry / Lead** — `id, propertyId|null, userId|null, userName, userEmail?, phone, budget?, city?, message, status("Pending"|"Responded"), date, phoneVerified, source?("contact_page" | "signup" | "signup-prompt"), consent?(bool), intent?("Hot"|"Warm"|"Cold"), interest?{intent, score, purpose, city, type, beds, budget, keywords[], viewedIds[], visits, line}`
**Interest profile** (per visitor, today `re-interest` on their device; `src/utils/interest.js`) — `visits, firstSeen, lastSeen, views[{id,city,type,beds,purpose,price,t}], searches[{purpose,city,type,beds,maxPrice,q,t}], saves[…], compares[…], lastEvent, lastEventAt`. `summarise()` → `{hasSignal, score, intent, purpose, city, type, beds, budget, focus, line, keywords[], viewedIds[], lastViewedId, visits}`.
**BlogPost** (seed `src/data/blog.json`, live in `re-blog`) — `id, slug, title, description, category, author, cover, date, updated, intro, body (markup, see utils/blogBody.js), media{key: dataURL}, faqs[{question,answer}], related[slugs], featured, active`
**Faq** — `id, question, answer, category, pages[home|about|contact], active` (array order = display order)
**Testimonial** — `id, name, city, rating, text, avatar, active` (seeds are inactive samples)
**Company** (defaults `src/data/company.js` → live in `re-company`, read with `useSettings().company`) — `name, domain, tagline, foundedYear, reraAgentId, address{}, officeHours, social{}, ceo{name,title,experienceYears,photo,summary,expertise[],quote}`
**Site content** (defaults `src/data/siteDefaults.js` → live in `re-site-content`, read with `useSettings().siteContent`, tokens via `fill()`) — `nav[], home{hero…, sections[{id,enabled}]}, why, how, cta, about, team, contact, footer, forms{buyBudgets,rentBudgets}, options{possession,furnishing}, nudge{enabled,delaySeconds,minScore,cooldownDays,title,titleFallback,text,buttonLabel,dismissLabel,benefits[],consentText}, seo{autoLinkCities,autoLinks[{keyword,to}]}`
**Property** additionally carries `active`, and for agent-posted listings `agentId, submittedBy (user id), reviewStatus("pending"|"approved"|"rejected"; missing = approved), reviewNote`. Only `active && reviewStatus approved` listings are public.
**Legal pages** — `siteContent.legal.{privacy|terms|disclaimer} = { title, updated, intro, sections[{title, body}] }`; **Agent program** — `siteContent.agentProgram = { enabled, registerLabel, title, benefits[], consentText, pendingNotice, rejectedNotice, listingReviewNote }`.

Property CSV column order is `PROPERTY_CSV_COLUMNS` in `src/utils/csv.js`. Arrays flatten to `a;b;c`; `nearby` flattens to `Type:Name:Distance;…`.

## 6a. Admin CMS layer

| Piece | Role |
|---|---|
| `context/DataContext.makeCrud` | One CRUD API per collection (`upsert, upsertMany, patch, remove, removeMany, setActive, toggleActive, move`); exposed as `propertyCrud, agentCrud, blogCrud, faqCrud, testimonialCrud, inquiryCrud`. Derived public lists: `activeProperties, approvedAgents, activeBlogPosts, activeFaqs, activeTestimonials`. |
| `components/admin/CollectionAdmin` | The generic list + editor screen (search, filters, bulk, reorder, CSV, restore samples). Entity pages only pass `schema`, `columns`, `csv` config. |
| `components/admin/SchemaForm` | Renders fields from data: text · url · number · date · textarea · select · toggle · multiselect · image · imageList · stringList · objectList (nested) · icon · custom. Dotted keys (`ceo.name`). |
| `components/admin/ImageField / ImageListField` | **Choose from device** (resized to ≤1000 px JPEG via canvas, stored as a data URL) **or paste a link**. |
| `utils/contentCsv.js`, `utils/csv.js` | Per-entity CSV template/export/parse with row validation. **Links only** for images; upserts by id/slug. |
| `utils/blogBody.js` + `components/blog/BlogBody` | Safe markup → React (no raw HTML): `##`, `###`, lists, tables, `>`, `![alt](url \| media:key)`, `**bold**`, `[link](url)`. |
| `utils/backup.js` | Whole-site JSON backup/restore (secrets stripped). |
| `utils/storageStatus.js` | Reports localStorage write failures; admin shows a "storage full" alert. |

## 7. Key modules

| Module | Responsibility |
|---|---|
| `utils/tracking.js` | Imperatively injects official Meta Pixel + Google gtag scripts; `trackPageView`, `fireLeadEvent` (safe no-ops when unconfigured) |
| `SettingsContext.fireLeadEvent(name)` | The **only** way components fire conversion events |
| `utils/geo.js` | haversine, `destinationPoint`, `hashBearing` (deterministic amenity pin placement) |
| `utils/csv.js` | property CSV parse/serialise, inquiries export, download helper |
| `PropertyMap.jsx` | react-leaflet map: price pin, amenity markers, street/satellite, expand, ResizeObserver + `invalidateSize` |
| `LeadForm.jsx` | 2-step details → OTP form; standalone mock OTP; not tied to login |
| `Seo.jsx` | Helmet wrapper: title, description, canonical, robots, OG/Twitter, article times, JSON-LD (one object or an array), `noindex`. Rendered by **every** page |
| `utils/seo.js` | `breadcrumbLd`, `faqLd`, `personLd`, `organizationLd`, `listingsHeading` (buying-intent H1/title), `listingsPath` (single canonical URL per filter combo), `formatPriceShort` |
| `utils/listingsSeo.js` | Computes listing-page FAQs and locality roll-ups from live inventory — nothing invented |
| `utils/blog.js` | sorted posts, `getPost`, reading time, date format |
| `data/company.js` | Company/CEO facts; empty fields hide their UI (address, hours, RERA ID, social) |
| `glass/motionComponent.js` | Cached `motion.create()` so GlassCard/GlassButton keep a stable component type |
| `scripts/generate-seo-files.mjs` | Regenerates `public/sitemap.xml`, `llms.txt`, `llms-full.txt`, `feed.xml`; wired to `npm run seo` and `npm run build` |
| `scripts/prerender.mjs` | Writes `dist/<route>/index.html` for every public URL (see §4a) |
| `entry-server.jsx` | `render(url)` for pre-rendering (`StaticRouter` + the same `Providers` / `AppRoutes` as the browser) |
| `TopBanner.jsx` | Admin-driven banner; sets `--banner-h` CSS var so sticky navs offset correctly |
| `home/PromoTicker.jsx` | Admin-managed marquee between navbar and hero. CSS-only animation (`.ticker-track`, `--ticker-duration` from text length × speed), seamless via two copies, pauses on hover/focus, static + scrollable under `prefers-reduced-motion`. Accepts a `config` prop for the admin live preview |

## 7a. Third-party services

| Service | Use | Notes |
|---|---|---|
| OpenStreetMap tiles | street map | free, no key |
| Esri World Imagery | satellite | free, no key |
| Unsplash / pravatar | demo images | replace with own uploads/CDN |
| Meta Pixel, Google Ads | ad tracking | real |

> CartoDB free raster tiles now show a "KEY REQUIRED" watermark — do not use without a key.

## 8. Backend (built — `backend/`)

The API described in §8a exists in the `backend/` folder (Express 5 + MongoDB/Mongoose, 88 tests) **and the website is connected to it**. Start with [`backend/README.md`](../backend/README.md): setup, environment, endpoint list, security notes, deploy.

**Two modes, one code base.** `VITE_USE_API=true` (set for production builds in `.env.production`) makes the site use the API; without it the site runs on browser storage as before (handy for front-end work without the backend). The switch lives in `src/api/client.js` (`USE_API`, `api()`, `fetchAll()`, error toast bus) and the contexts:

| Context | API mode |
|---|---|
| `AuthContext` | `ApiAuthProvider`: session from `GET /auth/me` (HttpOnly cookie), OTP send / login / register, admin user management (optimistic, server decides) |
| `DataContext` | starts from the build snapshot, then loads `/public/bootstrap` (+ `/admin/*` for admins, `/agent/*` + `/me/*` for agents / clients); `makeApiCrud` gives every admin screen the same `upsert / patch / remove / setActive / move / upsertMany` that now save on the server (optimistic, rolled back with a toast on refusal) |
| `SettingsContext` | `useApiSettings`: snapshot → `/public/settings` or `/admin/settings`; an admin's edit is saved with `PUT /admin/settings/:key` after 1 s |
| `InterestContext` | still on-device; for a signed-in client also batches events to `/me/events` |
| forms | `AuthSheet`, `LeadForm`, `Contact` use the OTP + lead endpoints; images upload to `/uploads` (`utils/images.js`) |

**Build data = snapshot.** `scripts/fetch-snapshot.mjs` writes `src/data/snapshot.json` from `GET /api/public/bootstrap` (falls back to the previous snapshot, then to the sample data). The sitemap / llms files, the pre-render and the client bundle all read it, so the pre-rendered HTML and the first client render are identical (hydration), and the page then refreshes itself from the live API. `npm run release` (`scripts/release.mjs`) builds into `dist-next/` and swaps it in (no downtime); the backend runs it (`REBUILD_COMMAND`) when the admin publishes content.

**Deploy**: `.github/workflows/deploy.yml` — tests, then on the VPS: backend (`npm ci`, pm2 `ncr-api`, health check), website (`npm run release`), nginx reload. nginx proxies `/api` and `/uploads` (`deploy/nginx-api.snippet.conf`, generated from the `.template` with `PORT` from `backend/.env`; the health check requires `"service":"ncr-api"` so another app on the same port can never pass as this API), so the site and API share one origin.

Where §8a's requirements live in the code: OTP + sessions → `services/auth.js`; leads / consent / intent → `services/leads.js`, `models` (Lead, Consent); agent rules → `routes/agent.js`; approval workflow → `routes/admin-properties.js`; slugs → `services/property.js` + `lib/propertySlug.js`; legal history + secrets masking → `services/settings.js`; rebuild hook → `lib/misc.js`; uploads → `routes/uploads.js`.

## 8-old. Original backend plan (kept for reference)

```
React (Vite)  ──HTTPS──▶  Express API  ──▶  MongoDB (Mongoose)
                              │
                              ├─ Auth: phone + OTP → JWT (httpOnly cookie)
                              ├─ WhatsApp Cloud API (OTP + lead templates)
                              ├─ SMTP (Nodemailer) for email
                              └─ Uploads (S3 / Cloudinary)
```

Migration approach:
1. Keep API response shapes identical to the JSON in §6 so context providers swap `import json` → `fetch` with minimal change.
2. Collections: `properties`, `agents`, `users`, `inquiries`, `settings` (singleton), `savedSearches` (later).
3. Move `whatsappConfig.accessToken` and `mailConfig.smtpPassword` to server env / encrypted settings — never returned to the client.
4. Replace the mock OTP with a server-generated, hashed, expiring code (rate-limited).
5. Move `active` / approval filtering server-side (public endpoints return only active / approved).
6. Generate `sitemap.xml` dynamically from listings.

The complete, step-by-step hand-off for everything built so far is in **§8a**.

## 8a. Backend hand-off — what must move from the browser to the server

**Rule of thumb:** today every admin edit, lead and preference lives in the visitor's own `localStorage`. The backend's job is to make those the *same for everyone*, and to make new content reach Google.

### A. Data that moves to the API (localStorage key → collection → who may read it)

| Key today | Collection / endpoint | Written by | Public read |
|---|---|---|---|
| `re-properties` | `properties` — `GET /properties`, admin CRUD + CSV | admin | only `active !== false` |
| `re-agents` | `agents` | admin (+ agent signup → `pending`) | only approved |
| `re-blog` | `posts` (incl. `summary`, `faqs`, `related`, `media`) | admin | only `active` |
| `re-faqs`, `re-testimonials` | `faqs`, `testimonials` | admin | only `active` |
| `re-inquiries` | `leads` — `POST /leads` (public, rate-limited), `GET/PATCH/DELETE` admin | website forms + sign-up | never |
| `re-user`, `re-extra-users`, `re-user-overrides` | `users` + session (JWT httpOnly cookie) | sign-up / admin | own profile only |
| `re-saved`, `re-compare`, `re-recent` | `savedProperties` per user (compare / recent may stay local) | user | own |
| `re-company`, `re-site-content`, `re-ticker`, `re-top-banner`, `re-cities`, `re-property-types` | `settings` singleton — `GET /settings/public`, `PUT /settings` admin | admin | public fields only |
| `re-whatsapp-config`, `re-mail-config`, `re-marketing-config` | `settings` (secret parts server-only) | admin | only `displayPhone`, `metaPixelId`, `googleAdsId`, `googleAdsConversionLabel` |
| `re-interest` | keep on device; **also** `POST /events` after consent (see C) | visitor | never |
| `re-nudge`, `re-banner-dismissed`, `re-theme` | stay on device | visitor | — |

Seams to swap (nothing else should need to change): `usePersistedState` in `SettingsContext` / `DataContext` / `AuthContext` → API hooks that return the same `[value, setValue, ready]`; `makeCrud` in `DataContext`; `addInquiry` (leads); `loginWithPhone` / `signupWithPhone` (auth). Keep response shapes = the JSON shapes in §6.

### B. Leads pipeline (this is what the sign-up prompt feeds)

`POST /leads` body = the `Inquiry / Lead` shape in §6. The server must:
1. **Verify the phone with a real OTP** (server-generated, hashed, expiring, rate-limited) before marking `phoneVerified: true`. The current on-screen OTP is a mock.
2. **Store the consent record**, not just `consent: true`: the exact sentence shown (`siteContent.nudge.consentText` version), timestamp, IP and user-agent, and the form/`source`. This is the proof DPDP Act 2023 expects.
3. **De-duplicate by phone**: a returning number updates its lead (append the new interest, bump `intent`) instead of creating a new row.
4. **Recompute `intent` server-side** from the stored events (do not trust the client). Same rule as `summarise()` today: score = viewed homes×2 + searches×2 + saves×4 + compares×3 + (returning visitor 3) + (≥3 homes 2); Hot ≥ 12, Warm ≥ 5.
5. **Notify + assign**: WhatsApp `lead_notification` template to the team (and `lead_thank_you` to the visitor if they opted in), assign to an agent by city, keep `status` and a follow-up note/timestamp.
6. Fire the ad conversion from the browser as today (`fireLeadEvent(name, { city, property_type, intent })`) — **never send name / phone / e-mail** to Meta / Google from the client; if server-side conversions (Meta CAPI) are added, hash identifiers and only with consent.
7. Admin endpoints: list / filter (`intent=Hot`, `status`), export CSV (columns `source, intent, interest, consent` already in `inquiriesToCsv`), change status, delete.

### C. Behaviour / interest data (the "silent" personalisation)

- **Today:** recorded on the visitor's device only (`InterestContext`), summarised into the lead at sign-up.
- **With a backend:** (a) keep recording locally; (b) once the visitor has signed up and consented, `POST /events` in small batches (`view | search | save | compare`, with the same fields as the profile arrays) so the server has the history before the first call and across devices; (c) anonymous → user merge happens at sign-up: send the local profile once, then clear the "sent" events.
- **Retention & rights (DPDP):** expose `GET /me/data` (export), `DELETE /me` (erasure — removes user, leads' personal fields and events), `POST /me/withdraw-consent` (stop contacting). Keep events for a fixed period (e.g. 12 months) and document it in `/privacy`.
- **"Picked for you"** stays client-side (`matchScore`) until there is a lot of inventory; then move to `GET /recommendations` using the same scoring.
- **Cross-device saved homes** = `savedProperties` per user. Until this exists, do not claim "synced on all devices" in the prompt copy.

### C2. Agents, listings moderation & legal pages (must be enforced on the server)

- **Auth roles** `user | agent | admin` in the JWT. Agent registration = `POST /auth/register {role:'agent', name, phone, city, agency?, reraId?, consent}` → creates `users` + `agents(status:'pending')`; OTP-verified.
- **Agent endpoints** (all scoped to the agent's own `agentId` from the token — never from the request body): `GET/POST/PATCH/DELETE /agent/properties`, `GET /agent/leads`, `PATCH /agent/leads/:id` (status only), `GET/PATCH /agent/profile`. The server must **force** `agentId`, `submittedBy`, `reviewStatus='pending'`, `active=false` on create, ignore `featured / verified / active / reviewStatus / agentId` from an agent, and reset a rejected listing to pending when the agent edits it. An agent may toggle `active` only on an `approved` listing. Rate-limit and validate like the admin endpoints; images through the upload service.
- **Admin endpoints**: `GET /admin/properties?reviewStatus=pending`, `POST /admin/properties/:id/approve` (rejects if the agent is not `approved`), `POST /admin/properties/:id/reject {note}`, agent approve / reject (notify the agent by WhatsApp / SMS when approved or rejected).
- **Public reads** return only `active && reviewStatus==='approved'` properties and `approved` agents; a pending agent's contact details must never be returned.
- **Notifications**: new agent registered / new listing awaiting review → admin; approved / rejected → agent; enquiry on an agent's listing → that agent (WhatsApp `lead_notification`).
- **Legal pages** live in `settings.legal` (`privacy`, `terms`, `disclaimer`) served by `GET /settings/public`. Keep a **version history** (text + `updated` date + who changed it) and store, on every consent (sign-up, enquiry, agent registration), which version of which text the user accepted.
- **SEO**: the three legal pages, agent profiles and approved listings are pre-rendered / rendered from this data (§E). Unapproved or deactivated items return 404 and drop out of the sitemap.

### D. Promises in the prompt copy that the backend must actually fulfil

The default benefits (`siteDefaults.nudge.benefits`) say a property advisor can WhatsApp new matches and that site visits can be booked in one tap. Build, in this order: (1) leads land in the admin panel with the interest summary; (2) a **saved-search + new-listing matcher** job (cron on new / changed `properties` → WhatsApp template to leads whose interest matches); (3) one-tap site-visit booking. Until each exists, edit the wording in Admin → Site Content → *Login prompt*.

### E. SEO consequences (very important — content will stop being static)

Today the crawlable pages are pre-rendered from the **shipped JSON** at build time (`scripts/site-data.mjs`). When content lives in a database:
1. `scripts/site-data.mjs` `loadData()` must read from the API (or DB) instead of `src/data/*.json`. Sitemap, `llms.txt`, `llms-full.txt`, `feed.xml` and every pre-rendered page follow automatically.
2. **Rebuild on publish**: when the admin publishes / edits a post, listing, city or company text, the API triggers the build (GitHub Actions `workflow_dispatch` / a webhook that runs `npm run build` on the VPS). Until rebuilt, a new URL is served by the SPA fallback (works for visitors, but bots get the empty shell).
3. **Better long-term:** run the existing `render(url)` from `src/entry-server.jsx` inside the Express server (SSR) with data injected — `DataProvider` / `SettingsProvider` need an `initialData` prop (first render must equal the client's first render). Cache the HTML by URL and purge it on publish. This removes the rebuild step and makes new listings indexable immediately.
4. Unpublished / deactivated content must return **404 / `noindex`** and disappear from sitemap + llms files on the next generation.
5. Keep the clean listing URLs (`/buy/{city}/{type|N-bhk}`) — the API should expose the same facets so `landingCombos()` can be computed server-side.
6. Keep `robots.txt` open to AI crawlers and keep `deploy/nginx.example.conf`'s `try_files` (or proxy to the SSR server).

### F. Security & compliance checklist
- Server-side admin auth (role in the JWT, not `localStorage`); `/admin/*` API routes require it. Remove the "demo numbers" hint from the login sheet.
- Secrets (`accessToken`, `smtpPassword`) only in server env / encrypted settings — never returned by any endpoint.
- Validate + sanitise every input (phones `^\d{10}$`, lengths, no HTML); rate-limit `POST /leads`, OTP send / verify, login.
- CORS allow-list = the site's origin; cookies `httpOnly`, `secure`, `sameSite`.
- Uploaded images → S3 / Cloudinary (URL stored, not data URLs); keep the "paste a link" option and links-only CSV.
- Logging without personal data; backups; a written retention policy that matches `/privacy`.
- Have `/privacy` and the consent sentence reviewed by a lawyer before collecting real data.

### F2. Property slugs on the server
- Store `slug` (unique index, lower-case) and `previousSlugs[]` on `properties`; generate with the **same algorithm** as `src/utils/propertySlug.js` (title → + city → + locality → + type / purpose / BHK → number) inside the create / update handlers, inside a transaction or with a retry on a duplicate-key error. Reject a client-supplied slug that collides with another listing's slug, old slug or id.
- `GET /properties/:slugOrId` resolves slug → old slug → id and returns `{ canonical: '/property/<slug>' }` (or a 301) so old links keep ranking.
- Slugs do not change when the title changes; only an explicit admin edit (or clearing the field) regenerates one, and the old value is appended to `previousSlugs`.
- The rebuild / SSR step (§E) emits `/property/<slug>` pages plus redirects for old ids; keep `dist/property-redirects.map` (or the API equivalent) so nginx can 301.

### G. Suggested build order
1. Express + Mongo, `settings`, `properties`, `agents`, `posts`, `faqs`, `testimonials` (read-only public + admin CRUD) → swap the providers.
2. Auth (real OTP → JWT) + users.
3. `leads` + consent log + admin lead views (Hot filter) → the sign-up flow starts paying off.
4. Images → cloud storage.
5. Rebuild-on-publish hook (or SSR) so SEO keeps working with dynamic content.
6. `events`, `savedProperties`, matcher / WhatsApp job, data-rights endpoints.

## 9. Known constraints & gotchas

- **`motion.create()` in render = remount every render.** It returns a new component type per call, so inputs lost focus after one keystroke and sliders dropped mid-drag. GlassCard/GlassButton now use `getMotionComponent()` (cached). Never call `motion.create` inside a component.
- **Static head tags duplicate Helmet's.** `index.html` must not contain `canonical` or `description` — Helmet adds its own and the static copy would sit beside it (a hard-coded `canonical="/"` made every route canonicalise to the homepage). Only `og:*`/`twitter:*` defaults remain, for crawlers that never run JS.
- **Grid columns need `grid-cols-1` + `min-w-0` on mobile.** A bare `grid lg:grid-cols-3` leaves an implicit `auto` column that grows to its widest child, so the page scrolled sideways on phones (property detail was 13–68 px too wide). Use `grid grid-cols-1 lg:grid-cols-3` and put `min-w-0` on grid/flex children that hold long text.
- **Pre-rendered, then hydrated.** Every public URL has real HTML in `dist/`; React hydrates it. Non-JS crawlers, link-preview bots and AI answer engines read that HTML. Admin edits live in each visitor's browser (`localStorage`), so the crawlable HTML reflects the **shipped** content until the backend exists.
- **React 19 hoists `<title>/<meta>/<link>`** to the start of the prerendered string (react-helmet-async v3 then leaves `helmetContext.helmet` empty). `scripts/prerender.mjs` peels that prefix into `<head>` (marked `data-prerender`); `main.jsx` removes those tags before hydrating so `<Seo>` doesn't duplicate them.
- **Non-prerendered URLs** (empty filter combinations, `/admin`, unknown paths) fall back to `index.html` and render client-side.
- **Conversion events fire once**, at submit (LeadForm, Contact, signup). `ThankYou` only page-views. `loadMetaPixel` / `gtag config` do not send their own page view — `trackPageView()` does.

- **`.glass` vs Tailwind position utilities** — `.glass` sets `position: relative` later in source than Tailwind, so `sticky`/`fixed`/`absolute`/`hover:bg-*` on the same node lose. Put them on a wrapper, or add a specific selector in `index.css`. See [rules.md](rules.md).
- **Route-param reuse** — React Router reuses a component across `/x/:id` changes. State-holding pages must be keyed by `id` (`PropertyDetail` → `PropertyDetailInner key={id}`).
- **Leaflet sizing** — needs `invalidateSize()` after any container size change.
- **Ad scripts** — must be injected via `createElement('script')`; scripts inserted via `innerHTML` never execute.
- **`localStorage`** can throw (private mode) — every access is wrapped in `try/catch`.
