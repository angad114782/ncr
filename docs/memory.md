# Memory — NCR Estates

> Project decision log and lessons learned — the "why" behind the code. Read this before changing anything non-trivial.
> Add a new entry (newest at the bottom of its section) whenever a decision is made or a bug teaches something.
> Related: [prd.md](prd.md) · [architecture.md](architecture.md) · [design.md](design.md) · [rules.md](rules.md) · [tasks.md](tasks.md)

## 1. Project snapshot

- **What:** Multi-page real-estate platform styled after iOS "Liquid Glass".
- **Stack:** React 19 + Vite + Tailwind 4 + framer-motion, mock JSON + `localStorage`.
- **Market:** India (₹, Indian cities). Chosen explicitly by the user over generic data.
- **Brand:** mocha `#674E40` + cream `#EFE3D7` (supplied by the user).
- **Business contact:** phone `8619930583`, email `info@propertyinncr.com`.
- **Next phase:** real backend on **MongoDB** (not Firebase / other) — mirror the existing JSON shapes.
- **Demo logins:** `8619930583` (admin), `9820011122` (user Kabir).

## 2. Decisions

| Date | Decision | Why |
|---|---|---|
| Sep 2026 | India-based data, ₹ | User's market |
| Sep 2026 | Frontend first, MongoDB later | Ship UI fast; DB choice fixed |
| Sep 2026 | Auth = Name + mobile + OTP (email/password removed) | User request; Indian market norm |
| Sep 2026 | Users keyed by `id`/`phone`, not email | Phone-signup users have no email |
| Sep 2026 | Same-city-only price comparisons | Cross-city averages mislead |
| Sep 2026 | Public pages use `activeProperties` / `approvedAgents` | Deactivated / pending items must not leak |
| Sep 2026 | Meta Pixel + Google Ads are **real**; WhatsApp + SMTP **demo-only** | Only the former can run in a browser safely |
| Sep 2026 | EmailJS tried then **removed**; email = SMTP via future backend | User explicitly rejected browser-side workaround |
| Sep 2026 | WhatsApp templates: `otpTemplate`, `leadNotificationTemplate`, `leadThankYouTemplate` | Covers all OTP entry points + both lead messages |
| Sep 2026 | Lead form is OTP-verified but **not** tied to login | Lower friction; anonymous leads matter |
| Sep 2026 | Contact page stays a simple form (no OTP/budget) | Not property-specific |
| Sep 2026 | Admin has its own `/admin/profile` route | Keeps admin inside the Admin Panel shell |
| Sep 2026 | Brand palette replaced iOS blue; status colors + WhatsApp green exempt | Brand identity vs universal meaning |
| Sep 2026 | Map default = Satellite | User preference |
| Sep 2026 | Cities, property types, top banner are admin-editable | Admin control without a developer |
| 2026-09-21 | Leadership facts (CEO **Angad Yadav, 5+ years**) live only in `src/data/company.js` | One source of truth for About/Team/Contact/JSON-LD; unknown facts stay empty & hidden |
| 2026-09-21 | Added Team, Blog, long-form About/Contact from competitor research | E-E-A-T + buying-intent coverage |
| 2026-09-21 | Sample testimonials hidden (`showTestimonials: false`) | Fake reviews are illegal/untrustworthy; user must supply real ones |
| 2026-09-21 | Contact form saves an inquiry and the conversion fires once, at submit | It previously discarded messages; ThankYou also firing doubled leads |
| 2026-09-21 | Listing filters + page number live in the URL; canonical via `listingsPath()` | One URL per filter combo; fixes empty-grid-on-page-2 bug |
| 2026-09-21 | Sitemap generated at build by script | Property/blog/city URLs change; hand-editing drifts |
| 2026-09-22 | Running strip lives on Home only (between navbar and hero); default messages are truthful nudges | User asked for an admin-run strip there ("physical" in the request was read as a scrolling / persuasive strip); no invented scarcity |
| 2026-09-22 | OTP-flow buttons use benefit-first wording + reassurance line | User asked for more psychological CTAs; keep it honest (no fake urgency) |
| 2026-09-22 | Whole site is admin-controlled: blog, FAQs, testimonials, agents, users, listings, company/CEO, page copy, menu, sections | User: "complete website dynamic, no hard-core any more" |
| 2026-09-22 | Images = upload from device **or** paste a link; CSV = links only | User's explicit rule; uploads are compressed data URLs in localStorage until a backend |
| 2026-09-22 | Blog body uses a tiny safe markup (not HTML / a WYSIWYG lib) | Easy manual writing + one CSV cell; no XSS surface; no new dependency |
| 2026-09-22 | FAQs pick their pages (Home/About/Contact); testimonials/agents/posts have `active` | One FAQ system instead of three hard-coded lists |
| 2026-09-22 | Sample testimonials ship inactive | Fake reviews must not be public |

## 3. Lessons learned (bugs & gotchas)

### 3.1 React Router reuses components across `:id` changes
**Symptom:** on `/property/p2` the EMI calculator, gallery index and map toggles still showed property 1's state — reported as "map not showing".
**Cause:** same route pattern → same component instance; local `useState` never reset.
**Fix:** `PropertyDetail` wraps `PropertyDetailInner key={id}`. Map also got a `ResizeObserver` + `invalidateSize()` and a loading overlay.
**Rule:** any `/entity/:id` page with local state must be keyed by id.

### 3.2 `.glass` silently breaks Tailwind `sticky` and `hover:bg-*`
**Cause:** `.glass` (in `index.css`, declared after `@import "tailwindcss"`) sets `position: relative` and `background`; same specificity + later source wins over utilities.
**Fix:** position utilities go on a plain wrapper (`<aside className="md:sticky md:top-28 md:self-start">`); hover uses `button.glass:hover, a.glass:hover` in `index.css`. Flex-row sticky items also need `self-start`.

### 3.3 Misleading Price Insight
**Cause:** fell back to a national average when no same-city peer existed → "143% above average" for Mumbai vs Pune/Delhi.
**Fix:** same city (+ type when possible) only; render nothing if no peers. Added p13/p14 so common cases have local peers.

### 3.4 Lead form broke user dashboards
**Cause:** first `LeadForm` didn't set `userId`, but dashboards filter `i.userId === user?.id`.
**Fix:** always pass `userId: user?.id ?? null`. Earlier ripple: switching from email to phone auth required moving inquiry matching from `userEmail` to `userId` everywhere.

### 3.5 Hardcoded blue survived the rebrand
**Cause:** `GlassButton` shadows and map pin colors used literal iOS-blue values.
**Fix:** `color-mix(in srgb, var(--color-accent) 35%, transparent)`; pin colors switched to brand. Grep for stray hex after any palette change — only `#25D366` should remain.

### 3.6 Ad scripts must be injected imperatively
Scripts added via `innerHTML` / `dangerouslySetInnerHTML` never execute. `utils/tracking.js` uses `createElement('script')`.

### 3.7 Free map tiles change
CartoDB free raster tiles now show "KEY REQUIRED". Use OSM (street) + Esri World Imagery (satellite); dark mode via CSS filter on the tile pane only.

### 3.8 Seed data is immutable at runtime
Static JSON imports can't be edited. Profile/phone edits are stored as overrides (`re-user-overrides`) merged on read. Validated: new phone must be a real 10-digit number not owned by another account.

### 3.9 Stale dev-server ≠ code bug
A blank page once turned out to be a stale HMR/extension issue (fine in Incognito). Try Incognito / restart Vite before debugging code.

### 3.10 Body wash colour
A rainbow radial-gradient body background was likely the "I don't like the colors" complaint. Canvas stays flat; one soft accent glow only.

### 3.11 `motion.create()` inside a component remounts everything (fixed 2026-09-21)
**Symptom:** typing in Profile / Home search / Listings search / Settings / Contact fields accepted one character per click; the budget slider dropped mid-drag; typed lead-form text vanished when the heart was toggled.
**Cause:** `GlassCard`/`GlassButton` called `motion.create(Component)` on every render → new component type → whole subtree unmounted/remounted. Only `LeadForm` worked because its state lived *inside* the card.
**Fix:** `getMotionComponent()` caches one motion component per base component. **Rule:** never create components in render. Earlier Playwright checks used `fill()`, which can't catch this — use real key presses (`keyboard.type`) when testing inputs.

### 3.12 Conversions and page views were double-counted (fixed 2026-09-21)
`LeadForm` fired `Lead`/`conversion`, then `ThankYou` fired it again; `loadMetaPixel` sent PageView and `TrackingScripts` sent it again; `gtag config` auto-sent `page_view` on top of the manual one. Now: conversion once at submit, PageView once per route, `send_page_view: false`.

### 3.13 Static `<head>` tags fight Helmet (fixed 2026-09-21)
`index.html` had `canonical="/"` and a default description. Helmet *adds* tags, it doesn't remove static ones, so every route canonicalised to the homepage and pages had two descriptions. Removed them; only `og:*`/`twitter:*` defaults stay for non-JS scrapers (WhatsApp/Facebook previews) — real per-URL previews need pre-rendering.

### 3.14 Competitor research (2026-09-21) — what top sites do
Searched buying-intent queries ("3 BHK flats for sale in Noida", "ready to move flats in Gurgaon", "best property dealers Delhi NCR", first-time-buyer guides) and read Square Yards' listing + blog pages, Malik Estate Agents, Manchanda Realtors. 99acres / NoBroker blocked automated fetch (403/404); gurgaonprop.com now hosts unrelated content.
- **Listing pages:** H1 = "3 BHK Flat in Noida for Sale"; title adds count + average price; sections for budget filters, top developers, new-launch / under-construction / ready-to-move, top localities with avg price, property-type mix, budget-range breakdown, ~8 FAQs, government charges, "last updated", big internal-link blocks (localities, types, nearby cities). Filters: BHK, budget, type, furnishing, possession, posted-by, amenities. → Applied: BHK + possession filters, dynamic H1/title, computed localities/budget/type/FAQ/related blocks.
- **Local dealers:** trust = years in business / founder name, services list (buy, sell, lease, JV), address + phones + email, RERA/legal disclaimer, testimonials, long (13-section, 10-FAQ) landing pages, blog. → Applied: CEO + experience, services, compliance section, Team page, blog, FAQs.
- **Blog:** author byline with credentials, last-updated date, table of contents, H2/H3, tables/checklists, FAQ, related posts, CTA, ~1,500 words. → Applied on all 7 posts (shorter, ~500–900 words — extend over time).
- **Gap we can't copy without data:** locality/sector pages, developer pages, live market stats — they need real inventory and a backend.

### 3.15 Mobile sideways scroll on the property page (fixed 2026-09-22)
**Symptom:** horizontal scrollbar at the bottom of `/property/:id` on phones (13–68 px extra width depending on the listing).
**Cause:** `grid lg:grid-cols-3` has no mobile column template, so the implicit `auto` column grew to its widest child (long address/title, map row, price rows).
**Fix:** `grid-cols-1` (= `minmax(0,1fr)`) + `min-w-0` on the column wrappers, `break-words` on title/address. **Check:** compare `scrollWidth` vs `clientWidth` at 360/390/414 px — pass `MSYS_NO_PATHCONV=1` to Node scripts on Git Bash or `/property/p1` gets rewritten to a Windows path.

### 3.16 Shell-generated code corrupted escapes (2026-09-22)
Files written through `node -e "…"` / heredocs with template literals lost backslashes and backticks: a phone regex became `/^d{10}$/` (every admin "Add user" failed) and a URL regex lost its `\/\/` (syntax error). Found by the browser test, not the build. **Rule:** create/patch code with the Write/Edit tools; if a script must patch a file, verify with `grep` and run the flow in a browser.

### 3.17 Uploaded images live in localStorage (2026-09-22)
Data URLs are ~100–200 KB each after compression (≤1000 px, JPEG 0.72) and localStorage is ~5 MB, so ~25–40 uploads fill it. `usePersistedState` now reports quota failures (admin banner), the Backup tab shows usage, CSV skips uploads, and **links remain the recommended path**. Meta tags / JSON-LD must never carry data URLs. `<img src="">` re-downloads the page — use `Avatar`/placeholders.

### 3.18 `textarea` was clipped to one line (fixed 2026-09-22)
`GlassInput` wrapped every field in a fixed `h-12` shell, so multi-line fields (Contact message, lead-form message) showed a single line. Textareas now grow (`min-h`, `items-start`).

## 4. Working preferences (user)

- Writes in Hinglish; comfortable with technical English. Answer in the same register.
- Wants the site to feel **complete vs. real market sites** — when it feels thin, research competitors first (99acres, MagicBricks, NoBroker; Zillow/Redfin for advanced ideas), then do a prioritised gap-fill.
- Cares about visual polish: colors, hover states, shadows, buttons. Review those after any theme change.
- Wants real things where possible (real ad tracking), and honest "demo-only" labels where not.
- Prefers being told reasoning behind added fields/assumptions instead of silent guesses.
- Verified-in-browser results preferred over "it builds".
- Dictates requests in Hinglish (speech-to-text: "physical" ≈ psychological / running). When a word looks wrong, pick the most sensible reading, say which one was used, and keep it easy to change.
- Wants "commit and push, then tell me" after a batch of work.
- Wants **nothing hard-coded**: any text, list, image or setting a business owner might change should be editable in the admin (add / edit / active-inactive), with manual **and** CSV entry, and images by upload **or** link.
- For SEO/content work: wants competitor-driven changes — search buying-intent keywords, inspect competitor sites, apply the findings to **every** page (keywords, sections, content). Wants Google E-E-A-T trust signals (real CEO, experience, team, blog).
- Gave real facts for the CEO only (Angad Yadav, 5 years). Everything else (address, RERA ID, photo, reviews) still needs to come from them — never fill gaps with invented details.

## 5. Feature timeline

1. **Base build** — public site, dashboards, admin, mock data.
2. **Market gap-fill** — EMI, map, lightbox, floor plans, compare, recently viewed, testimonials/FAQ, WhatsApp button, badges, sort + pagination, share, 404.
3. **Internal linking + unique features** — cross-link sections, Price Insight, Distance to Hubs.
4. **Redfin-style map** — react-leaflet, price pin, amenity markers, satellite, expand.
5. **Route-param state leak fix** + map hardening.
6. **Phone + OTP auth** (email/password removed).
7. **Business contact + Admin Settings** (WhatsApp Cloud API, mail).
8. **SMTP-specific mail config**; admin number set to real business number.
9. **Editable profile** with overrides layer.
10. **Profile tab** in all role navs (`/admin/profile`).
11. **Bulk CSV + moderation** — CSV import/export, active toggle, agent approvals, `activeProperties` / `approvedAgents`.
12. **Ad tracking** — Meta Pixel + Google Ads (real), lead events.
13. **OTP lead form + Thank You page.**
14. **Reverted EmailJS** → SMTP (demo) + WhatsApp lead templates.
15. **OTP WhatsApp template.**
16. **iOS system-color palette** (later superseded).
17. **Brand palette** (mocha / cream / terracotta / gold).
18. **Polish** — hardcoded blue removal, hover states.
19. **Home redesign + SEO + TopBanner + admin-managed cities/types** *(uncommitted — see [tasks.md](tasks.md))*
20. **Site-wide review** — found the GlassCard remount bug, double conversions, canonical bug, contact form that saved nothing (§3.11–3.13).
22. **Fully admin-controlled CMS** — generic admin engine, Blog/FAQ/Reviews/Agents/Users/Listings/Site-Content admin, image upload-or-link, CSV everywhere, backup/restore (§3.16–3.18).
21. **Competitor-driven content & SEO pass** — Team, Blog, long-form About/Contact, listing SEO blocks + BHK/possession filters, Seo on every page, generated sitemap (§3.14)..

## 6. Reference: localStorage keys

`re-theme` · `re-user` · `re-extra-users` · `re-user-overrides` · `re-properties` · `re-inquiries` · `re-saved` · `re-compare` · `re-recent` · `re-agents` · `re-whatsapp-config` · `re-mail-config` · `re-marketing-config` · `re-cities` · `re-property-types` · `re-top-banner` · `re-ticker` · `re-banner-dismissed`

Clear all `re-*` keys in DevTools to reset the demo to seed data.

## 7. Backend hand-off notes

- Keep API responses identical to the seed JSON shapes.
- `whatsappConfig` and `mailConfig` map directly to server-side credentials — same fields, different storage (env / DB, never sent to the browser).
- OTP must become server-generated, hashed, expiring and rate-limited.
- Public endpoints return only `active` properties and `approved` agents.
- Sitemap should be generated from live listings.
- Default to MongoDB + Mongoose unless the user changes their mind.

## 8. Entry template

```
### <short title>  (YYYY-MM-DD)
**Context:** what was being done
**Decision / Finding:** what was decided or learned
**Why:** reasoning
**Apply next time:** the rule of thumb
```
