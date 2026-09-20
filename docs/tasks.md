# Tasks — NCR Estates

> Work tracker. Update this file whenever work starts, finishes, or is re-prioritised.
> Related: [prd.md](prd.md) · [architecture.md](architecture.md) · [design.md](design.md) · [rules.md](rules.md) · [memory.md](memory.md)

Legend: `[x]` done · `[~]` in progress / uncommitted · `[ ]` todo · 🔴 high · 🟡 medium · 🟢 low

_Last updated: 2026-09-21_

---

## ✅ Done

### Foundation
- [x] Vite + React 19 + Tailwind 4 + framer-motion setup
- [x] Liquid Glass design system (`.glass*`, tokens, light/dark)
- [x] Brand palette (mocha `#674E40` + cream `#EFE3D7`) with light/dark pairs
- [x] Providers: Theme, Auth, Data, Settings; `localStorage` persistence (`re-*`)
- [x] India-based seed data (₹, Indian cities): properties, agents, users, inquiries, testimonials, FAQs, landmarks

### Public site
- [x] Home, Listings (filters, sort, pagination, sticky sidebar), Property Detail, Agents, Agent Profile, About, Contact, Compare, 404
- [x] EMI calculator, image lightbox, floor-plan tab, video-tour badge, RERA / verified / possession badges, share
- [x] Compare tool (max 3) + sticky compare bar
- [x] Recently viewed, testimonials, FAQ accordion
- [x] Floating Call / WhatsApp contact rail
- [x] Interactive react-leaflet map (price pin, amenity markers, street/satellite, expand, directions)
- [x] Price Insight (same-city only) and Distance to Key Hubs
- [x] Cross-linking sections on property detail (similar city / budget / type / agent)
- [x] Fixed state leak across `/property/:id` navigations (`key={id}` remount)

### Auth & user dashboard
- [x] Phone + OTP signup/login (mock OTP shown inline)
- [x] Dashboard: Overview, Saved, My Inquiries, Profile
- [x] Editable profile with unique 10-digit phone validation + overrides layer
- [x] Profile tab in both Dashboard and Admin nav

### Lead capture & tracking
- [x] OTP-verified `LeadForm` (Name, Mobile, Budget, optional Email) → `/thank-you`
- [x] Meta Pixel + Google Ads config, real client-side firing, page-view on route change
- [x] Conversion events on inquiry, contact form and signup (fired once, at submit)

### Admin
- [x] Overview, Manage Listings, Manage Users, Manage Inquiries, Settings, Profile
- [x] CSV template download + CSV import with per-row error review
- [x] Per-listing Active/Inactive toggle; public pages honour it
- [x] Agent approval workflow (approve / reject / disapprove)
- [x] Leads CSV export (with budget + verified columns)
- [x] Settings: site contact info, WhatsApp Cloud API config (3 templates), SMTP config, marketing IDs

### Design fixes
- [x] Removed rainbow body wash; single soft accent glow
- [x] Button shadow now uses accent variable (was hardcoded blue)
- [x] Hover states for glass buttons/links; map pin colors on-brand

---

### Content, SEO & trust (2026-09-21)
- [x] Competitor research (Square Yards listing + blog pages, Malik Estate Agents, Manchanda Realtors, buying-intent SERPs) — findings in [memory.md](memory.md) §3.14
- [x] **About** rewritten (~900 words): story, mission, leadership, services, trust process, live numbers, cities, compliance, FAQs
- [x] **Team** page — CEO Angad Yadav (5+ yrs) + approved consultants
- [x] **Contact** rewritten — enquiry form now saved as an inquiry (visible to admin), intent/city fields, next-steps, FAQs
- [x] **Blog** — index + article template + 7 guides (`src/data/blog.json`), author byline, updated date, TOC, FAQ, related
- [x] **Listings SEO** — BHK + possession filters, buying-intent H1/title, localities/budget/FAQ/related-link block, page number in URL (fixes empty-grid bug)
- [x] `<Seo>` on **every** page + JSON-LD (Organization, Person, ContactPage, AboutPage, ItemList, RealEstateListing, BlogPosting, FAQPage, Breadcrumb); panels / thank-you / 404 / empty listings are noindex
- [x] Sitemap generator (`npm run sitemap`, runs before build) — 67 URLs incl. city/BHK/type landing pages, posts, properties
- [x] Home: popular searches, CEO spotlight, latest guides; fake "4.7★" stat removed; unverifiable claims reworded; sample testimonials hidden
- [x] Nav/Footer: Team + Blog links, city/BHK/possession link silos, contact + disclaimer, real socials only
- [x] **Running strip** — admin-managed ticker between navbar and hero (Admin → Settings → Running Strip: messages, links, speed, on/off, live preview)
- [x] **Mobile property page** no longer scrolls sideways (grid `min-w-0` fix); all 14 public routes checked at 360 / 390 px
- [x] **Psychological CTA copy** — "Get My Free Callback", "Confirm & Book My Callback", "Send Me a Secure Code", "Create My Free Account", "Confirm & Take Me In", with reassurance micro-copy
- [x] Fixed: GlassCard/GlassButton remounting every render (typing lost focus, sliders dropped), double conversion/PageView events, canonical always "/", duplicate meta tags, listing header overflow on mobile, fake video-tour link

---

## 🔄 In progress

- [~] Everything above is **uncommitted** (plus the earlier Home redesign / TopBanner / Admin Settings work). Review in light + dark + mobile, then commit in chunks (glass fix · SEO infra · pages · content).
- [ ] 🔴 **Owner inputs needed** (pages hide these until filled — edit `src/data/company.js`):
  - CEO photo (`/public/angad-yadav.jpg` → `ceo.photo`), and review the drafted bio / expertise / quote
  - Office address, office hours, founding year
  - RERA real-estate-agent registration number
  - Facebook / Instagram / LinkedIn / YouTube URLs
  - Real client reviews → `src/data/testimonials.json`, then `showTestimonials: true`
  - Confirm the copy on About ("How we keep listings trustworthy") matches actual practice

---

## 📋 Backlog

### 🔴 Backend (next phase)
- [ ] Choose stack + hosting (Node/Express + MongoDB Atlas suggested)
- [ ] Mongoose schemas mirroring the JSON shapes in [architecture.md](architecture.md) §6
- [ ] REST API: properties CRUD, agents, users, inquiries, settings
- [ ] Phone + OTP auth with JWT (httpOnly cookie), hashed/expiring OTP, rate limits
- [ ] Replace context `import json` with API calls; keep provider shapes stable
- [ ] Server-side `active` / approval filtering on public endpoints
- [ ] Move WhatsApp token + SMTP password server-side; never return to client
- [ ] Data migration script from seed JSON

### 🔴 Messaging
- [ ] WhatsApp Cloud API: OTP (authentication template), lead-notification, lead-thank-you
- [ ] SMTP (Nodemailer): admin notification + user auto-reply
- [ ] Remove "demo-only" labels once live

### 🟡 Product
- [ ] Image upload (Cloudinary/S3) instead of URL fields
- [ ] Complete the admin Add/Edit listing form — today it creates `price: 0`, hard-coded agent `a1`, one stock image, no lat/lng/description
- [ ] Saved searches + alerts
- [ ] Agent self-service login and listing submission
- [ ] Analytics dashboard with real numbers (leads over time, top listings)
- [ ] Lead status workflow (Pending → Contacted → Closed) with notes
- [~] Sitemap is generated at build from the data files; serve it dynamically once listings come from an API
- [x] Property-detail JSON-LD and `noindex` on panels / thank-you (done 2026-09-21)
- [ ] Reuse `LeadForm` for a homepage "Get a callback" CTA (`property` undefined)

### 🟡 Quality
- [ ] Add smoke/e2e tests (Playwright) for: lead flow, auth, CSV import, admin toggles
- [ ] Accessibility audit (contrast on glass, focus rings, aria labels)
- [ ] Performance pass: image `loading="lazy"`, code-split admin + map, Lighthouse
- [ ] Error boundary + empty/error states for all lists
- [ ] Update `README.md` (still the Vite template) — link to `docs/`

### 🔴 SEO / growth (next)
- [ ] **Pre-render or SSR** (e.g. react-snap / Vite SSG / migrate to Next.js) — link previews and non-JS crawlers still see only `index.html` defaults
- [ ] Add NCR cities as first-class markets — Noida, Greater Noida, Ghaziabad, Faridabad — with real listings (the domain is *propertyinncr*; competitors rank on "flats in Noida / Gurgaon")
- [ ] Locality landing pages (`/buy/flats-in-sector-150-noida`) once locality data exists
- [ ] Google Search Console + sitemap submission, Google Business Profile (needs a real address), Bing Webmaster
- [ ] More posts monthly (news/market updates need a human editor — nothing here is auto-generated)
- [ ] Optional: builder/project pages, price-trend charts from real data

### 🟢 Nice to have
- [ ] Multi-language (Hindi)
- [ ] PWA / installable
- [ ] Neighbourhood pages (`/city/:city/:locality`) for SEO
- [ ] Mortgage pre-approval / bank partner widgets
- [ ] Dark-mode map tiles from a keyed provider

---

## 🐛 Known issues / tech debt

**Critical before any public deploy (frontend-only limits)**
- Admin data is **per-browser** (`localStorage`): visitors' leads, Meta/Google IDs, banner, cities, listing edits never reach the admin's browser or other visitors.
- Admin panel is not secure: role is read from `localStorage` (`re-user`), and the login sheet prints the admin number; OTP is mock and shown on screen (so `phoneVerified` is not real verification).
- WhatsApp token / SMTP password are stored in plain `localStorage` — don't enter real secrets.

**Bugs still open**
- Profile allows empty name / phone (empty phone locks the user out); changing phone needs no OTP.
- `Compare`, `CompareBar`, `Saved`, `DashboardHome`, `PriceInsight` read raw (incl. deactivated) listings; `PropertyDetail` shows rejected agents' contact details.
- `PriceInsight` gives NaN when a peer has `areaSqft: 0` (CSV default). Saved list is device-wide, not per-user.
- `AdminHome` "Active Agents" counts pending/rejected; changing the site email silently overwrites `smtpUsername`; Google Ads badge shows "Active" before save.
- CSV import: unparseable prices become 0 silently; no duplicate detection; city/type/agent not validated. CSV export is open to spreadsheet formula injection.
- `PropertyMap` injects `priceLabel` as raw HTML (escape it). Navbar avatar logs out with no confirmation and no aria-label. PropertyCard photo isn't a link.
- Property-card "Video Tour" badge shows for `videoTour: true` listings that have no video URL.
- Bundle is one 860 kB chunk (no code-splitting).

**Content / legal**
- Demo data: stock photos, made-up agents / ratings, fake RERA IDs — replace before launch (RERA advertising rules).
- Bundled testimonials are sample data (hidden by default).
- Brand/domain mismatch: site is *NCR Estates* / propertyinncr.com but emails in seed data use ncrestates.in and inventory is all-India.

**Minor**
- OTP uses `Math.random`; `prefers-color-scheme` block in `index.css` is redundant; `README.md` is still the Vite template; lint reports 12 warnings, 0 errors.

---

## Task template

```
- [ ] <verb> <thing> — <why / acceptance>
      Files: src/…
      Docs to update: architecture.md / rules.md / design.md
```
