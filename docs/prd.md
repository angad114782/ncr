# PRD — NCR Estates (Real Estate Platform)

> Product Requirements Document. Source of truth for **what** we are building and **why**.
> Related: [architecture.md](architecture.md) · [design.md](design.md) · [rules.md](rules.md) · [tasks.md](tasks.md) · [memory.md](memory.md)

## 1. Overview

**NCR Estates** (`propertyinncr.com`) is a multi-page real-estate platform for the Indian market. Visitors search, compare and enquire about properties to **buy or rent**; registered users manage saved properties and enquiries; admins manage listings, users, leads and site-wide integrations.

- **Market:** India — all pricing in ₹ (lakh / crore), Indian cities and localities.
- **Cities:** Mumbai, Delhi, Bangalore, Pune, Hyderabad, Chennai, Gurugram (admin-editable).
- **Property types:** Apartment, Villa, Studio, Commercial, Penthouse, House (admin-editable).
- **Business contact:** phone `8619930583`, email `info@propertyinncr.com`.
- **Phase:** Frontend only (React + mock JSON + `localStorage`). A MongoDB backend is planned next.

## 2. Goals

1. Generate **qualified, phone-verified leads** for the business (primary KPI).
2. Match the feature depth of 99acres / MagicBricks / NoBroker, plus a few Zillow/Redfin-style tools useful in India.
3. Give the admin full control of listings, agents, leads, contact info, and ad tracking **without a developer**.
4. Look and feel like a native iOS "Liquid Glass" product, in the brand palette (mocha brown + cream).
5. Rank on search — proper meta, Open Graph, JSON-LD, canonical URLs, sitemap, robots.

### Non-goals (for now)
- Payments, e-signature, or property transactions.
- Native mobile apps (responsive web only).
- Multi-language UI.
- A real backend (tracked as a later phase in [tasks.md](tasks.md)).

## 3. Users & roles

| Role | How they sign in | What they can do |
|---|---|---|
| **Visitor** (anonymous) | — | Browse, search, filter, compare, view details, submit OTP-verified lead form, contact form |
| **User** | Name + mobile + OTP | Everything above + save properties, see own enquiries, edit profile |
| **Agent** | Listed profile (`status: approved / pending / rejected`) | Appears on Agents page and on their listings; approved by admin |
| **Admin** | Mobile + OTP (role `admin`) | Full panel: listings, users/agents, inquiries, settings, own profile |

Auth is **phone + OTP only** (no email/password). Demo numbers: `8619930583` (admin), `9820011122` (user).

## 4. Functional requirements

### 4.1 Public site
| Area | Requirement |
|---|---|
| **Home** | Hero with rotating word, live counters, budget finder, explore cities, city price trends, newest listings, popular buying-intent searches ("2 BHK Flats for Sale in Mumbai"), why-choose-us, how-it-works, top agents, **CEO spotlight**, recently viewed, **latest blog guides**, list-your-property CTA, FAQ. Testimonials are hidden until real ones exist (`COMPANY.showTestimonials`). Optional dismissible top banner and an **admin-managed running strip** (ticker) between the navbar and the hero. |
| **Listings** `/listings` | Filters: purpose, city, type, **BHK**, **possession (Ready to Move / Under Construction)**, max price, keyword. Sort, pagination, sticky sidebar. Filters **and page number live in the URL**. Dynamic buying-intent H1 (e.g. "3 BHK Flats for Sale in Mumbai") and an SEO block computed from real inventory: intro, popular-localities table, budget links, property-type breakdown, FAQs, related-search links. |
| **Property detail** `/property/:id` | Gallery + lightbox, badges (Verified, RERA, possession status, video tour), floor plans tab, EMI calculator, interactive map with nearby amenities, Price Insight, Distance to Key Hubs, OTP lead form, share, WhatsApp/call, and cross-linking sections (similar in city, similar budget, same type, more from agent). Deactivated listing shows "no longer available". |
| **Compare** `/compare` | Up to 3 properties, sticky compare bar. |
| **Agents** `/agents`, `/agents/:id` | Only **approved** agents shown. |
| **About** `/about` | Long-form trust page: why we exist, mission, CEO/leadership, services, how listings are kept trustworthy, live platform numbers (computed, never hard-coded), cities served, compliance & disclosures, FAQs. |
| **Team** `/team` | CEO profile (Angad Yadav, 5+ yrs), expertise, quote; approved consultants; working standards; join/partner CTA. |
| **Contact** `/contact` | Call / WhatsApp / email cards, address & hours **only when configured**, enquiry form (intent, city, message) that is **saved as an inquiry** and visible to admin, "what happens next", FAQs. |
| **Blog** `/blog`, `/blog/:slug` | 7 buying guides (first-time buyer, ready vs under-construction, RERA check, home loan/EMI, stamp duty, documents checklist, choosing a dealer). Author byline, updated date, TOC, table, FAQ, related posts, disclaimer. |
| **Thank You** `/thank-you` | Reached after a submitted enquiry; `noindex`. The conversion fires once at submit, not here. |
| **404** | Catch-all page. |
| **Global** | Floating Call / WhatsApp rail, recently-viewed tracking, light/dark theme. |

### 4.2 Lead capture
- Property enquiry = **Name + OTP-verified Mobile + Budget** (+ optional Email).
- Works for anonymous visitors; if logged in, pre-fills and links the lead to `userId`.
- Budget options adapt to purpose (Buy → lakh/crore ranges; Rent → monthly ranges).
- On success: save inquiry (`phoneVerified: true`), fire ad conversion, redirect to `/thank-you`.

### 4.3 User dashboard `/dashboard`
Overview, Saved properties, My Inquiries (with budget + verified badge), Profile (editable name / phone / city; phone must be a unique 10-digit number).

### 4.4 Admin panel `/admin`
| Page | Requirement |
|---|---|
| **Overview** | Analytics summary. |
| **Listings** | CRUD, per-row Active/Inactive toggle, **CSV template download** (built from live p1/p2 samples), **CSV import** with per-row error review, bulk add. |
| **Users** | User list (incl. runtime signups), **Pending Agent Approvals** (approve / reject), disapprove / re-approve approved agents. |
| **Inquiries** | Lead list with budget and verified badge, **Export Leads CSV**. |
| **Settings** | Site contact info (phone + email); WhatsApp Cloud API config (OTP / lead-notification / lead-thank-you templates); SMTP mail config; Meta Pixel + Google Ads config; manageable cities and property types; top-banner text/link; **running strip** (up to 10 messages, optional link each, speed, on/off, live preview). |
| **Profile** | Shared profile page inside the admin shell. |

### 4.5 Integrations — real vs demo
| Integration | Status | Why |
|---|---|---|
| Meta Pixel | **Real code**, but config is per-browser today | Script/events work; the Pixel ID is saved in the admin's own `localStorage`, so visitors only get it once settings move to a backend |
| Google Ads (gtag) | **Real** (client-side) | Runs entirely in browser |
| WhatsApp Cloud API | **Demo only** | Access token cannot live in the browser; needs backend |
| SMTP email | **Demo only** | SMTP cannot run in a browser; needs backend |
| OTP delivery | **Demo only** | OTP is shown inline ("Demo mode — your OTP is XXXX") until WhatsApp API is live |

### 4.6 SEO
Every page renders `<Seo>` (title, description, canonical, Open Graph / Twitter, JSON-LD, robots). Panels, thank-you, compare, 404s and empty/search/price-capped listing URLs are `noindex`.

| Page | Structured data |
|---|---|
| Home | Organization (RealEstateAgent + founder), WebSite + SearchAction, FAQPage |
| About / Contact / Team | AboutPage / ContactPage / ProfilePage + Organization + Person (CEO), BreadcrumbList, FAQPage |
| Listings | ItemList, BreadcrumbList, FAQPage (computed from real inventory) |
| Property | RealEstateListing (+Offer, geo, floor size), BreadcrumbList |
| Agent | Person, BreadcrumbList |
| Blog / post | Blog / BlogPosting (author = CEO, dates), BreadcrumbList, FAQPage |

`public/robots.txt` blocks `/admin`, `/dashboard`. `public/sitemap.xml` is **generated** by `npm run sitemap` (also runs before `npm run build`) from listings, city/BHK/type landing pages that have results, blog posts and static pages.

**Known limit:** the app is a client-rendered SPA. Google renders JS, but social/WhatsApp link previews (and slower crawlers) only see the static defaults in `index.html`. Pre-rendering / SSR is the biggest remaining SEO upgrade (see [tasks.md](tasks.md)).

### 4.7 Content & E-E-A-T
- Company/leadership facts live in **one file**: `src/data/company.js`. Only owner-confirmed facts are filled in (CEO Angad Yadav, 5+ years). Address, hours, founding year, RERA agent ID, social links and CEO photo are **empty and hidden** until the owner supplies them — nothing is invented.
- Trust signals used: named leader with experience, author bylines + "updated" dates, real contact details, compliance disclosures, RERA guidance, transparent process copy tied to features that really exist (agent approval, Verified badge, RERA display, same-city price insight).
- Sample testimonials and other unverifiable claims (fake stats, "24x7", "every listing RERA-checked") were removed or reworded.

## 5. Non-functional requirements

- **Performance:** fast first paint; lazy work where possible; animations via `transform`/`opacity`.
- **Responsive:** mobile-first; mobile bottom tab bar for panels, sidebar on desktop.
- **Accessibility:** readable contrast in both themes, keyboard-usable controls, `aria` labels on icon buttons.
- **Persistence:** all state survives reload (`localStorage`, `re-*` keys). Storage access must never crash the app.
- **Data correctness:** estimates and averages are **same-city only** — never cross-market comparisons.
- **Privacy:** secrets (access tokens, SMTP password) are demo-only on the frontend and must move server-side.

## 6. Success metrics

- Verified leads per week; lead → thank-you conversion rate.
- Ad conversion events firing correctly in Meta / Google dashboards.
- Listing-to-enquiry ratio; compare and save usage.
- Organic search impressions on city / type pages.

## 7. Roadmap (summary)

1. **Now — Frontend complete:** public site, dashboards, admin tooling, SEO, tracking. *(largely done — see [tasks.md](tasks.md))*
2. **Next — Backend:** Node + MongoDB (Mongoose); real auth, listings CRUD, inquiries, uploads.
3. **Then — Real messaging:** WhatsApp Cloud API for OTP + lead templates; SMTP for email.
4. **Later:** image uploads/CDN, agent self-service portal, saved searches + alerts, analytics dashboard.

## 8. Open questions

- Should agents get their own login and listing-submission flow, or stay admin-managed?
- Will listings be free, or is there a paid/featured tier?
- Hosting target for the backend (VPS, Render, AWS)?
- Which WhatsApp templates are approved by Meta yet?
