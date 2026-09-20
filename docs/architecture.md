# Architecture — NCR Estates

> How the system is built. Related: [prd.md](prd.md) · [design.md](design.md) · [rules.md](rules.md) · [tasks.md](tasks.md) · [memory.md](memory.md)

## 1. Stack

| Layer | Choice |
|---|---|
| Build / dev | Vite 8 |
| UI | React 19 (function components + hooks) |
| Routing | react-router-dom 7 (`BrowserRouter`) |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) + custom CSS tokens in `src/index.css` |
| Animation | framer-motion 13 |
| Icons | lucide-react |
| Maps | leaflet + react-leaflet 5 |
| CSV | papaparse |
| SEO | react-helmet-async |
| Lint | oxlint |
| Data (now) | Static JSON in `src/data/` + `localStorage` |
| Data (planned) | Node + Express + **MongoDB (Mongoose)** |

Scripts: `npm run dev` · `npm run build` · `npm run preview` · `npm run lint`.

## 2. Folder structure

```
ncr/
├─ docs/                     ← this documentation
├─ public/                   ← favicon, robots.txt, sitemap.xml (generated)
├─ scripts/generate-sitemap.mjs   ← builds public/sitemap.xml from the data files
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
| `PublicLayout` | none | `/`, `/listings`, `/property/:id`, `/agents`, `/agents/:id`, `/about`, `/team`, `/blog`, `/blog/:slug`, `/contact`, `/compare`, `/thank-you`, `*` (404) |
| `PanelShell` "Dashboard" | `ProtectedRoute` (any logged-in user) | `/dashboard`, `/dashboard/saved`, `/dashboard/inquiries`, `/dashboard/profile` |
| `PanelShell` "Admin Panel" | `ProtectedRoute requireAdmin` | `/admin`, `/admin/listings`, `/admin/users`, `/admin/inquiries`, `/admin/settings`, `/admin/profile` |

`/admin/profile` and `/dashboard/profile` render the **same** `Profile.jsx` but in their own shell (so title + active-tab highlight stay correct). A new role should follow the same pattern.

## 5. State & persistence

All state lives in React context and is mirrored to `localStorage` under `re-*` keys.

| Context | Keys | Contents |
|---|---|---|
| Theme | `re-theme` | `light` / `dark` |
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
id, title, type, purpose("Buy"|"Rent"), price(number), priceLabel("₹2.15 Cr"),
city, locality, address, lat, lng, beds, baths, areaSqft, furnishing, yearBuilt,
agentId, featured, verified, reraId, possessionStatus, videoTour, videoUrl?, postedDate,
description, active?, images[], floorPlans[], amenities[], nearby[{type,name,distance}]
```
**Agent** — `id, name, role, city, phone, email, avatar, rating, dealsClosed, status("approved"|"pending"|"rejected"), bio`
**User** — `id, name, phone (auth key), email? (legacy, display only), role, city`
**Inquiry** — `id, propertyId|null, userId|null, userName, userEmail?, phone, budget?, intent?, city?, source?("contact_page"), message, status, date, phoneVerified`
**BlogPost** (seed `src/data/blog.json`, live in `re-blog`) — `id, slug, title, description, category, author, cover, date, updated, intro, body (markup, see utils/blogBody.js), media{key: dataURL}, faqs[{question,answer}], related[slugs], featured, active`
**Faq** — `id, question, answer, category, pages[home|about|contact], active` (array order = display order)
**Testimonial** — `id, name, city, rating, text, avatar, active` (seeds are inactive samples)
**Company** (defaults `src/data/company.js` → live in `re-company`, read with `useSettings().company`) — `name, domain, tagline, foundedYear, reraAgentId, address{}, officeHours, social{}, ceo{name,title,experienceYears,photo,summary,expertise[],quote}`
**Site content** (defaults `src/data/siteDefaults.js` → live in `re-site-content`, read with `useSettings().siteContent`, tokens via `fill()`) — `nav[], home{hero…, sections[{id,enabled}]}, why, how, cta, about, team, contact, footer, forms{buyBudgets,rentBudgets}, options{possession,furnishing}`
**Agent / Property** also carry `active` (hidden when `false`).

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
| `scripts/generate-sitemap.mjs` | Regenerates `public/sitemap.xml`; wired to `npm run sitemap` and `npm run build` |
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

## 8. Planned backend architecture

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

## 9. Known constraints & gotchas

- **`motion.create()` in render = remount every render.** It returns a new component type per call, so inputs lost focus after one keystroke and sliders dropped mid-drag. GlassCard/GlassButton now use `getMotionComponent()` (cached). Never call `motion.create` inside a component.
- **Static head tags duplicate Helmet's.** `index.html` must not contain `canonical` or `description` — Helmet adds its own and the static copy would sit beside it (a hard-coded `canonical="/"` made every route canonicalise to the homepage). Only `og:*`/`twitter:*` defaults remain, for crawlers that never run JS.
- **Grid columns need `grid-cols-1` + `min-w-0` on mobile.** A bare `grid lg:grid-cols-3` leaves an implicit `auto` column that grows to its widest child, so the page scrolled sideways on phones (property detail was 13–68 px too wide). Use `grid grid-cols-1 lg:grid-cols-3` and put `min-w-0` on grid/flex children that hold long text.
- **Client-rendered SPA.** Per-page meta is injected after JS runs; link-preview bots see only `index.html` defaults.
- **Conversion events fire once**, at submit (LeadForm, Contact, signup). `ThankYou` only page-views. `loadMetaPixel` / `gtag config` do not send their own page view — `trackPageView()` does.

- **`.glass` vs Tailwind position utilities** — `.glass` sets `position: relative` later in source than Tailwind, so `sticky`/`fixed`/`absolute`/`hover:bg-*` on the same node lose. Put them on a wrapper, or add a specific selector in `index.css`. See [rules.md](rules.md).
- **Route-param reuse** — React Router reuses a component across `/x/:id` changes. State-holding pages must be keyed by `id` (`PropertyDetail` → `PropertyDetailInner key={id}`).
- **Leaflet sizing** — needs `invalidateSize()` after any container size change.
- **Ad scripts** — must be injected via `createElement('script')`; scripts inserted via `innerHTML` never execute.
- **`localStorage`** can throw (private mode) — every access is wrapped in `try/catch`.
