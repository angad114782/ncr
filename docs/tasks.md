# Tasks — NCR Estates

> Work tracker. Update this file whenever work starts, finishes, or is re-prioritised.
> Related: [prd.md](prd.md) · [architecture.md](architecture.md) · [design.md](design.md) · [rules.md](rules.md) · [memory.md](memory.md)

Legend: `[x]` done · `[~]` in progress / uncommitted · `[ ]` todo · 🔴 high · 🟡 medium · 🟢 low

_Last updated: 2026-09-22_

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

### Immersive UI (2026-09-22)
- [x] **Mobile menu** — full-screen off-canvas drawer that slides in from the right, freezes the page behind it, Esc / link / X / resize close it, focus returns to the hamburger, sub-menus expand, sign-in / call / WhatsApp / theme pinned at the bottom (`MobileMenu`, rendered in a portal)
- [x] **3D home showcase** on Home (three.js + react-three-fiber + drei): procedural modern house with pool, garden and trees; drag to orbit, leans toward the cursor, glowing hotspots with hover/tap cards, Day ↔ Night lighting. Lazy-loaded when scrolled near; pauses off-screen; WebGL / reduced-motion fallbacks. Section text, button and the 4 hotspots are editable in Admin → Site Content → Home blocks; the section can be hidden/re-ordered
- [x] **Cursor effects:** property cards + "why choose us" cards tilt in 3D with a moving glare; hero has a cursor spotlight; a soft cursor ring follows the mouse (desktop mouse only)
- [x] React pinned to 19.2.x (react-three-fiber's peer range is <19.3)

### UX fixes (2026-09-22)
- [x] **Scroll:** every page change starts at the top; Back/Forward restores position; #anchors work; filters on /listings don't jump the page (`ScrollToTop`)
- [x] **Listings inputs:** search and max-price no longer drop characters (debounced URL sync, replace-not-push)
- [x] **Hero:** proper rounded, padded panel with brand-coloured glows (was a hard-edged box with cramped text); checked in light, dark and mobile
- [x] Signed-in user avatars fall back to initials (no empty `src`)

### Fully admin-controlled site (2026-09-22)
- [x] Generic admin engine: `CollectionAdmin` + `SchemaForm` + `CsvToolbar` (search, filters, bulk actions, reorder, duplicate, confirm-delete, restore samples, CSV template/export/import with preview)
- [x] **Blog** admin — markup editor with toolbar, inline images (upload/link), preview, cover image, FAQs, related posts, featured, Published/Draft, CSV
- [x] **FAQs** admin — per-page placement (Home/About/Contact), order, active, CSV; About/Contact/Home FAQs now come from here
- [x] **Testimonials** admin (samples inactive), **Agents** admin (full CRUD, photo, approval, CSV), **Users** admin (add/edit/deactivate/delete, last-admin guard)
- [x] **Listings** admin rewritten — full editor (fixes the price-0 "Add listing" bug), photo/floor-plan upload **or** link, nearby places, video link, CSV with id round-trip and links-only images
- [x] **Site Content** admin — company & CEO, hero, home section order/visibility, why/how/CTA, About, Team, Contact, menu & footer, budgets & options, backup/restore
- [x] All public pages read that content (Home, About, Team, Contact, Blog, Footer, Navbar, forms); inactive items never reach visitors
- [x] Storage-full alert; `textarea` fields no longer clipped to one line; agent/CEO avatars fall back to initials; price labels drop trailing zeros
- [x] 42-step browser test of the whole flow (upload/link images, CSV, active toggles, site content, users, backup) + mobile overflow sweep of 14 pages

### SEO · AIO · GEO · speed · smooth scrolling (this batch)
- [x] **Pre-rendering**: all 87 public URLs are static HTML (real `<h1>`, `<title>`, canonical, JSON-LD, internal links) that React hydrates — verified with JavaScript disabled and with zero hydration errors on 12 pages
- [x] SSR-safe state: `usePersistedState` / Theme / Auth / Settings render defaults first, load `localStorage` in a layout effect
- [x] **Clean listing URLs** `/buy|rent[/city][/type|N-bhk]`, legacy `/listings?…` redirects, crawlable `?page=N` pagination, filter chips navigate to clean URLs
- [x] Dynamic interlinking: buttons → real `<Link>`s; `AutoLinkedText` (admin keyword rules + cities), related guides, `ExploreLinks`, `GuideLinks`, HTML `/sitemap` page, footer link
- [x] **AIO / GEO**: blog *Quick answer* field (admin + CSV + top-of-article box + `abstract`/`speakable`), `llms.txt`, `llms-full.txt`, AI-crawler-friendly `robots.txt`, RSS `feed.xml`, `hreflang`, generated sitemap (86 URLs)
- [x] **Speed**: admin / dashboard / Leaflet / three.js are lazy chunks, `<Img>` with responsive `srcset`, `content-visibility` sections, `deploy/nginx.example.conf`
- [x] **Smooth scrolling** (Lenis) — desktop only, reduced-motion aware, admin excluded, nested scrollers untouched, instant reset on route change

### Login prompts & lead capture (this batch)
- [x] Visitor interest profile on-device (views, searches, saves, compares, visits → focus, budget, Hot/Warm/Cold)
- [x] `LoginNudge` soft prompt (delay, once per session, cooldown, hidden on forms/panels), admin-editable in Site Content → *Login prompt*
- [x] Sign-up sheet with benefits, personalised "matching you with …" line and **consent checkbox**; creates a lead with interest, intent, source, consent
- [x] Home "Picked for you" section (admin can reorder / hide), `/privacy` page, footer + sitemap links
- [x] Admin Inquiries: intent badge, *Hot leads* filter, consent note, richer CSV; 29-step browser test

### Legal pages & agents (this batch)
- [x] **Privacy Policy, Terms & Conditions, Disclaimer** pages (`/privacy`, `/terms`, `/disclaimer`) — text fully admin-editable (Site Content, one tab each: title, updated date, intro, add / edit / remove sections); in footer, HTML sitemap, `llms.txt`, XML sitemap, pre-rendered
- [x] Sign-up sheet links to Terms + Privacy; **client is the default**, "I'm a property agent" switch reveals city / agency / RERA (admin can turn the option off, edit its text under *Agent program*)
- [x] **Agent role + Agent Panel** (`/agent`): overview with status banner, **My listings** (same editor as admin, CSV too), **Enquiries** on own listings, **Profile** (account + public agent profile)
- [x] **Moderation**: agent listings start pending + hidden; admin sees *Pending review (n)*, approves (needs approved agent) or rejects with a note; agents can hide/show only approved listings; only approved listings + approved agents are public
- [x] "Register as an agent" card on /agents and /team; agent links in navbar / mobile menu; Users admin can set role `agent`; 55-step browser test

### One phone-number flow, no login/sign-up choice (this batch)
- [x] `AuthSheet` no longer has login/sign-up tabs. One screen: Mobile Number → Send Code. The code is sent either
  way (tries `login` purpose, silently falls back to `register` on a 404 — the visitor never sees that error);
  the OTP step then asks for Name (+ City for the agent door) and consent **only when the number turns out to be
  new** — an existing number's OTP step is just the code
- [x] All the existing role-door rules (agent-only door, wrong-door rejection both ways, admin unreachable) are
  unaffected — verified with 14 local-mode + 9 API-mode Playwright checks (existing login, new sign-up, agent
  door new + repeat + wrong-door)
- [x] Backend unchanged (same `/auth/otp/send`, `/auth/login`, `/auth/register`); 110/110 tests still pass

### Role-separated login doors + abuse protection (this batch)
- [x] **Agent sign-up/login has exactly one door**: the Home "List My Property" banner, the navbar/mobile-menu **Add Listing** button (new), and `AgentRegisterCta` — all three open the same agent-only flow (`source: 'list'`, no buyer option). Every other entry point (navbar Sign In, login prompt, welcome/exit card, "picked for you") is buyer-only, with no way to choose "agent"
- [x] **A number that logs in from the wrong door is signed out again**, both directions: a buyer number at the agent door, or an agent number at the buyer door — each with a message pointing to the right one. Admin was already unreachable via any public form (`register`'s role is `z.enum(['user','agent'])` at the schema level)
- [x] **Escalating IP/phone block ladder** (`backend/src/lib/security-block.js`): repeated robotic login/sign-up attempts or repeated form junk → 24h → 48h → 7 days → permanent block on that IP or phone; a phone that keeps requesting an OTP and never verifies is blocked the same way. Blocked keys are turned away before the route runs (`ipBlockGuard`/`phoneBlockGuard`), so an abusive IP costs the server almost nothing — **the admin account is completely exempt**
- [x] Admin → **Security**: lists every block (current + past), unblock button (a shared IP or reassigned number can be caught by mistake — see `backend/README.md` for what this does and does not protect against)
- [x] 110 backend tests (was 101): the block ladder, exemption, guards, OTP-abuse trigger, admin list/unblock
- [ ] Bigger, not done this round: a site-wide Content-Security-Policy for the *website's* HTML (the API already gets Helmet's strict CSP by default — it just has no visible effect on JSON responses), Cloudflare/WAF in front of the VPS for distributed attacks — see `docs/rules.md` §19

### Bug sweep + SEO keywords applied (this batch)
- [x] **Bug sweep**: full backend suite (110/110), a 33-route Playwright crawl (console errors, H1s) and 13 role-door
  edge cases (mobile "Add Listing", admin never sees it, WelcomeModal's own login also rejects an agent number) — no
  real bugs found. One stale FAQ caught in passing: "How do I list my property" still described the old contact-form
  flow (fixed to match the agent sign-up door)
- [x] **"Gurgaon" now works everywhere "Gurugram" does**: `/buy/gurgaon` resolves and self-corrects its canonical to
  `/buy/gurugram` (`CITY_ALIASES` in `utils/listingsUrl.js`, no duplicate-content risk), and the free-text search box
  matches it too. This was free, real search volume the site was silently missing
- [x] FAQ updates targeting real search demand without fabricating inventory: "Which cities do you cover?" now names
  Gurgaon and invites a Noida/Ghaziabad/Faridabad/Greater Noida requirement as a lead; new FAQ for
  plot/builder-floor searches (same idea)
- [x] `docs/seo/priority.md`: which of the 154 candidate keywords can be targeted **now** (cluster H: cost/legal
  guides — pure content, no inventory) vs need real inventory first (new cities, a Plot/Builder-Floor type, a
  metro-distance field) — reasoning-based since real volume/KD numbers still need Semrush/Ahrefs (see `keyword-candidates.csv`)

### Keyword research (this batch)
- [x] `docs/seo/keyword-candidates.txt` / `.csv`: 154 NCR long-tail keywords (all seen in Google autocomplete on 2026-09-21), 9 clusters, with the page to build for each. **Volume and KD are blank** - paste the .txt into Semrush / Ahrefs (India), keep KD < 10 and volume 10-500
- [ ] Connect Semrush + Search Console (Supermetrics) to get the real competitor gap and the filtered list
- [ ] To rank for them the site needs Noida / Ghaziabad / Faridabad as cities, a "Gurgaon" alias for "Gurugram", sector / budget landing pages and real listings (today: 7 metro cities, 14 sample listings)

### Brand in WhatsApp greetings (this batch)
- [x] The text a WhatsApp button pre-fills (floating button, mobile menu, Contact page, thank-you page, agent button on a property page) is now **admin-editable** (Site Content → Contact: `contact.waGeneral / waEnquiry / waThankYou / waProperty`) and uses `{brand}` = the company name from Admin → Company & CEO (was a hard-coded "NCR Estates" in two places). Also dynamic now: agent page description + JSON-LD, admin overview line
- [ ] Sample content (FAQs, blog, reviews, agent bios) still says "NCR Estates" as plain text — it is stored content, edit it in the admin

### WhatsApp lead messages (this batch)
- [x] A filled lead form now WhatsApps **the team** (`lead_notification`: display number + admin number + assigned agent) **and welcomes the visitor** (`lead_thank_you`, once per number per 24 h; contact + property forms). Admin switches: welcome on/off, OTP-verified numbers only. See `backend/README.md` (template texts to create in Meta)
- [x] **Lead saved when the OTP is sent** (property form: `stage: "otp_sent"`) — shows in Inquiries as *OTP sent · not verified*, team notified at once; confirming the number later updates the same lead and sends the welcome
- [x] `lead_notification` now has 5 variables (name, mobile, project interest **+ live property link**, budget, location); `lead_thank_you` has 3 (name, property, number to call)
- [x] Admin → Settings → WhatsApp → **Send test messages to my number** (shows Meta's error per template); leads record `welcomeSentAt` / `adminNotifiedAt`
- [x] Agent-status WhatsApp no longer shares the lead template (own optional `accountUpdateTemplate`)
- [ ] 🔴 **You**: create + get approved the two templates in Meta (names exactly `lead_notification`, `lead_thank_you`), then press *Send test messages*. Until approved, leads are still saved but no WhatsApp goes out

### Loading skeletons & speed (this batch)
- [x] **Skeleton placeholders** (YouTube-style grey shimmer, `components/common/Skeleton.jsx` + `.skeleton` in `index.css`): images shimmer until loaded (`<Img>`), panels while their code loads (`PanelSkeleton`), a listing / agent / article page whose data is still coming (`DetailSkeleton`; `DataContext.dataReady` — no more "not found" flash for a listing published after the last build), the map and 3D showcase, and a **boot skeleton in `index.html`** for URLs without a pre-rendered page (admin, dashboard, agent panel) so the home page's HTML no longer flashes first
- [x] **gzip for JavaScript / CSS** (`deploy/nginx-speed.snippet.conf`): nginx was sending them uncompressed (762 KB JS + 54 KB CSS → ~235 KB). Measured on a throttled phone profile (slow 4G, 4× CPU): load 4.6 s → 2.2 s, first paint 3.2 s → 1.9 s
- [x] Vendor chunks (`vendor-react`, `vendor-router`, `vendor-motion`) so a returning visitor re-downloads only the small app file after a deploy
- [x] The deploy now runs `deploy/setup-nginx.sh` itself (adds only the missing include lines, each tested and rolled back alone; never fails the deploy)
- [ ] Ideas not done: route-level code splitting of the public pages (needs chunk preloading before hydration), Brotli (needs the nginx module), replacing framer-motion in cards with CSS hover, an India-region server / CDN

### SEO audit fixes (this batch)
- [x] **www → apex 301 redirect + `charset utf-8`** via `deploy/nginx-site.snippet.conf` (fixes: canonical points to a different page, missing self-referential hreflang on www, duplicate www/non-www). Applied by `bash deploy/setup-nginx.sh` (re-run it once — it only adds the missing include)
- [x] Home **title 73 → 56 chars** and **description 200 → 139 chars**; both now editable in Admin → Site Content → Home page (`home.seoTitle` / `home.seoDescription`)
- [x] No duplicate headings on Home (budget results and city rates no longer repeat card / city headings); "View All" links have unique text; ticker default link has no `?param`
- [x] Real **favicon** (was the Vite template logo) and **apple-touch-icon** (`public/apple-touch-icon.png`)
- [ ] Not code: response time (server is in Germany → India-region VPS or a CDN such as Cloudflare), backlinks, social sharing. `/contact?intent=…` and filter links keep their parameters on purpose (canonical points to the clean page)

### Welcome, exit prompt & agent entry (this batch)
- [x] **"List My Property" → agent sign-up**: the Home banner button opens the agent registration directly (no buyer/agent switch, intro line), then lands the new agent on *My listings* to post the property (admin reviews it before it goes live). A signed-in agent goes straight to *My listings*; a signed-in buyer or the admin gets the same agent form with a "continuing signs you out" note. This door is **agents only**: tabs read *Agent login* / *Register as agent*, a buyer number is refused at the agent login (and signed out again). Only the switch-off (`cta.agentSignup`) makes the button follow `cta.link`. Files: `ListPropertyCta.jsx`, `AuthSheet.jsx`
- [x] **Luxury welcome card** on arrival (`WelcomeModal.jsx`, once per session, delayed, not on forms/panels/for crawlers); closing it can open the sign-up form (`welcome.onClose`)
- [x] **Exit-intent card**: mouse leaving through the top (desktop) or a quick swipe up after reading down the page (phones); once per session, after 8 s
- [x] **Login with an unknown number → sign-up**, number kept and a notice shown (`AuthSheet.switchToSignup`)
- [x] Admin: Site Content → *Welcome & exit card*, *Home → Banner* toggle, *Agent program → list intro*

### Readable property URLs (this batch)
- [x] `/property/<slug>` — slug from the title; duplicates get city → locality → type / purpose / BHK → number; unique against slugs, old slugs and ids
- [x] Old `/property/p6` links keep working (client redirect, pre-rendered stub with canonical + refresh, generated nginx 301 map); renamed slugs redirect via `previousSlugs`
- [x] Admin **URL slug** field (blank = auto, typed = cleaned + uniqueness check), CSV `slug` column, duplicate / CSV / agent posts all get unique slugs, older saved data is back-filled; sitemap, llms.txt, JSON-LD use slugs; 22-step test
- [x] Fixed: admin **Duplicate** on Listings crashed (`newId` import lost in the earlier refactor)

---

## 🔄 In progress

- [~] Everything above is **uncommitted** (plus the earlier Home redesign / TopBanner / Admin Settings work). Review in light + dark + mobile, then commit in chunks (glass fix · SEO infra · pages · content).
- [ ] 🔴 **Owner inputs needed** (pages hide these until filled — now edited in **Admin → Site Content → Company & CEO**):
  - CEO photo (`/public/angad-yadav.jpg` → `ceo.photo`), and review the drafted bio / expertise / quote
  - Office address, office hours, founding year
  - RERA real-estate-agent registration number
  - Facebook / Instagram / LinkedIn / YouTube URLs
  - Real client reviews → `src/data/testimonials.json`, then `showTestimonials: true`
  - Confirm the copy on About ("How we keep listings trustworthy") matches actual practice

---

## 📋 Backlog

### ✅ Backend built (this batch) — see `backend/README.md`
- [x] `backend/` — Express + MongoDB API: public data, phone-OTP auth (JWT cookie), roles user / agent / admin, leads with consent records and server-side intent, agent panel API with moderation, admin API (listings, agents, users, blog, FAQs, reviews, leads, settings incl. legal pages with version history, stats, audit, backup), image uploads, slugs, rebuild webhook, seed script — **88 tests pass**
- [x] **Website connected to the API** (API mode: auth, data, admin / agent panels, settings, legal pages, forms with OTP, image uploads, saved homes, interest events) — 44-step browser test on the real backend + all earlier local-mode tests still pass
- [x] **Deploy workflow** builds & starts both: tests → backend (pm2) → website (`npm run release`, no downtime) → nginx; `backend/ecosystem.config.cjs`, `deploy/nginx-api.snippet.conf`
- [x] Publishing content in the admin rebuilds the pre-rendered site by itself (`REBUILD_COMMAND`)
- [ ] 🔴 **MongoDB Atlas login failed** (`bad auth`): check the user / password in Atlas → Database Access, then `cd backend && npm run check-db && npm run seed`
- [ ] Configure WhatsApp Cloud API (OTP + lead alerts) and SMTP in Admin → Settings; without WhatsApp, OTPs cannot be sent in production
- [ ] 🔴 **One-time server setup before the first deploy** (backend/README §6): `backend/.env` on the VPS, nginx: `bash deploy/setup-nginx.sh` (adds the /api proxy; port follows `PORT` in `backend/.env`, which must be a port no other app uses — e.g. 5120), Atlas Network Access for the VPS IP, then deploy. The database starts **empty** with only the admin account (`ADMIN_PHONE`) — sample data is optional (`npm run seed:samples`, or the workflow's **seed** option); `npm run clean -- --yes` wipes everything except the admin. Until `backend/.env` exists the deploy stops early and the live site stays on its previous build.
- [ ] Add the WhatsApp Cloud API details in Admin → Settings (OTP delivery); admin phone `8619930583` is the first admin
- [ ] **Rotate the Atlas password** — it was shared in a chat message; set the new one only in `backend/.env`

### 🔴 Backend (original checklist — mostly done above) — this is what makes admin edits reach every visitor
- [ ] 📘 **Read [architecture.md](architecture.md) §8a first** — it is the full migration spec for everything below (collections, endpoints, consent log, lead pipeline, SEO rebuild / SSR, security).
- [ ] **Leads pipeline** — `POST /leads` with real OTP verification, consent record (sentence version, time, IP, UA), de-duplicate by phone, server-side Hot/Warm/Cold, WhatsApp team notification, agent assignment, admin Hot-leads view. (Front end already sends `source, consent, intent, interest` — swap `addInquiry`.)
- [ ] **Events + data rights** — `POST /events` after consent, `GET /me/data`, `DELETE /me`, consent withdrawal, retention policy matching `/privacy`.
- [ ] **Saved homes per user** (`savedProperties`) so "synced on all devices" becomes true; saved searches + new-listing WhatsApp matcher (fulfils the login-prompt promise).
- [ ] **SEO with dynamic content** — `scripts/site-data.mjs` reads the API; rebuild-on-publish hook (or Express SSR using `entry-server.jsx` with `initialData`); unpublished content → 404 / out of sitemap + llms files.
- [ ] **Move the admin CMS collections to an API** (`re-blog, re-faqs, re-testimonials, re-agents, re-properties, re-inquiries, re-company, re-site-content, re-ticker, re-top-banner, re-cities, re-property-types`). The `makeCrud` API and `usePersistedState` are the only two seams to swap.
- [ ] Image storage (Cloudinary / S3) so uploads stop living in browser storage; keep the "paste a link" option
- [ ] Server-side admin auth (today admin = a flag in localStorage)
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

**Slugs (new)**
- To get real 301s for old `/property/<id>` links, add the `map` from `deploy/nginx.example.conf` on the VPS (the pre-rendered stub page already redirects instantly, so nothing breaks without it).
- Slugs are generated in the browser today; the server must generate and enforce uniqueness itself (architecture §8a F2).

**Agents & legal (new)**
- 🔴 The **agent rules are enforced in the browser only** (listings stamped pending, own-listing scope, no self-approval). A logged-in agent could still edit `localStorage` by hand — real enforcement needs the API (architecture §8a C2).
- 🔴 The **legal text is a draft** — have a lawyer review Privacy, Terms and Disclaimer (and the consent sentences) before launch. Add real registered-office details / jurisdiction if your lawyer asks.
- Agent approval / rejection and "new listing waiting" have **no notifications** yet (admin has to open the panel). Add e-mail / WhatsApp with the backend.
- Agent photo uploads count toward browser storage — prefer image links (same limit as every other upload).

**Lead capture (new)**
- 🔴 Leads created by sign-up live in the visitor's browser only — they do **not** reach the admin panel until the backend exists (same limit as every other form). Wire `addInquiry` to the API first.
- 🔴 Have a lawyer review `/privacy` and the consent sentence before collecting real customer data (DPDP Act 2023). Do not promise WhatsApp matches / alerts in the prompt text unless the team will send them.
- Real SMS OTP is still a mock (OTP shown on screen) — a verified number is not truly verified yet.

**SEO / deploy (new)**
- 🔴 **Verify nginx `try_files $uri $uri/ /index.html;`** on the VPS (see `deploy/nginx.example.conf`). Without it crawlers still get the empty shell. Check: `curl -s -A Googlebot https://propertyinncr.com/about | grep -o "<h1[^>]*>"`.
- Crawlable HTML reflects the **shipped** content. Posts / listings the admin adds live only in the admin's browser until the backend exists — then re-run the build (or move to server-side rendering) so they get static pages, sitemap entries and `llms.txt` lines.
- Submit `https://propertyinncr.com/sitemap.xml` in Google Search Console and Bing Webmaster Tools; request indexing for the home page and the top `/buy/{city}` pages.
- `scripts/prerender.mjs` renders with Node — keep the build Node version ≥ 20 on the VPS.

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
- Main bundle is ~388 kB (113 kB gzip); three.js (929 kB) and Leaflet (160 kB) are lazy chunks. Further splitting of `framer-motion` is possible.

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
