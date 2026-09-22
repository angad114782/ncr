# NCR Estates — Backend API

Express 5 + MongoDB (Mongoose) REST API for the website in the parent folder. It replaces the browser
`localStorage` "database" with a real one: listings, agents, blog, FAQs, reviews, site settings (incl. the
legal pages), users with OTP login, leads with consent records, agent panel with moderation, uploads.

```
backend/
  src/
    server.js            starts the API (connects to MongoDB, makes sure an admin exists)
    app.js               Express app (security headers, CORS, CSRF guard, rate limits, routes, errors)
    config.js            environment settings (+ refuses unsafe production config)
    models/index.js      User, Agent, Property, Post, Faq, Testimonial, Lead, Consent, Otp, Saved, Event, Setting, LegalVersion, Audit, Upload
    routes/              public · auth · me · agent · admin-* · uploads · events (live updates)
    services/            settings, auth (OTP, sessions, consent), property (slugs), leads
    lib/                 validation schemas (zod), security helpers, notifications, the IP/phone block ladder, slug + interest rules (copies of the website's)
    seed/seed.js         loads the website's sample data into MongoDB
  tests/                 127 tests (run on a throw-away in-memory MongoDB — never on your real database)
  uploads/               uploaded images (git-ignored)
```

## 1. Set up

```bash
cd backend
npm install
cp .env.example .env      # then fill in MONGODB_URI and JWT_SECRET (a .env is already here for local use)
npm run check-db          # tests the MongoDB connection
npm run seed              # makes sure the admin account exists — nothing else is added
npm run seed:samples      # (optional) also loads sample listings / agents / blog / FAQs — adds only what's missing
npm run clean             # dry run of "delete everything except the admin";  npm run clean -- --yes  really does it
npm run dev               # http://localhost:5120  (npm start in production)
```

**MongoDB Atlas checklist** — if `check-db` fails:
- `bad auth : authentication failed` → wrong username / password in `MONGODB_URI`. Atlas → *Database Access* → edit the user → set a new password (avoid `@ : / ? #` characters or URL-encode them).
- `ENOTFOUND` / `timed out` → Atlas → *Network Access* → add the IP of this computer / the VPS (or `0.0.0.0/0` while testing).
- The database name is the part after `.net/` (here `ncr`); it is created automatically.

The first admin is created automatically for `ADMIN_PHONE` (default `8619930583`): request an OTP for that number to log in.

## 2. Environment (`.env`)

| Variable | Meaning |
|---|---|
| `MONGODB_URI` | Atlas connection string (**secret**) |
| `JWT_SECRET` | ≥ 32 random characters — signs sessions (**secret**) |
| `CLIENT_ORIGINS` | websites allowed to call the API (CORS + CSRF check), comma separated |
| `OTP_DEV_MODE` | `true` returns the OTP in the API response (development only — refuses to start in production if true) |
| `OTP_LENGTH` | digits in the code, default 6 |
| `PUBLIC_API_URL` | public URL of this API, used for upload links (e.g. `https://api.propertyinncr.com`) |
| `COOKIE_SAMESITE` | `lax` (default). Use `none` only if the site and API are on different domains |
| `REBUILD_COMMAND` | shell command run on this server (debounced 30 s) when public content changes, e.g. `cd /var/www/propertyinncr.com && npm run release` — rebuilds the pre-rendered site with no downtime |
| `REBUILD_WEBHOOK_URL` / `_TOKEN` | alternative to the command: a URL that is POSTed instead (e.g. a deploy hook) |
| `ADMIN_PHONE`, `ADMIN_NAME` | first admin account |
| `UPLOAD_DIR`, `PORT`, `TRUST_PROXY` | optional |

WhatsApp (OTP + lead alerts) and e-mail (SMTP) credentials are **not** in `.env` — the admin saves them in
the panel (`PUT /api/admin/settings/whatsapp` / `mail`); tokens are stored server-side and never returned.
Without a WhatsApp provider OTPs cannot be delivered: in production the API answers `503 otp_unavailable`.

### WhatsApp messages when a lead form is filled

| Who | Template (Admin → Settings → WhatsApp) | Variables |
|---|---|---|
| **The team** — the *Display Phone Number*, the admin login number (`ADMIN_PHONE`) and the assigned agent, the moment a lead arrives | `lead_notification` | `{{1}}` name · `{{2}}` mobile · `{{3}}` project interest **with the live link of the page** (`Property title - https://propertyinncr.com/property/<slug>`; the contact page or home page link for other leads) · `{{4}}` budget (`Not shared` if empty) · `{{5}}` location |
| **The visitor** — a welcome, for the contact and property enquiry forms, once per number per 24 h, after the number is confirmed | `lead_thank_you` | `{{1}}` first name · `{{2}}` the property (or what they asked about) · `{{3}}` the number to call (`+91` + the Display Phone Number) |

**A code was sent but never typed in:** the property form saves the lead as soon as the visitor asks for the code (`POST /leads` with `stage: "otp_sent"`), marked *OTP sent · not verified* in Admin → Inquiries, and the team is told right away. If the visitor then confirms the number, the **same** lead is updated (verified, no second team message, one consent record) and the welcome goes out. The welcome never goes to an unconfirmed number.

WhatsApp only allows a business to start a chat with a **pre-approved template**, so both must first be created in
Meta (Business Manager → WhatsApp Manager → Message templates), language **English** (`en`), category **Utility**, named exactly as above. Text:

```
lead_notification
New lead received! 🔔

Name: {{1}}
Mobile: {{2}}
Project Interest: {{3}}
Budget: {{4}}
Location: {{5}}

Please follow up immediately.
```

```
lead_thank_you
Hi {{1}}! 🎉

Thank you for your enquiry about *{{2}}*.

✅ Your request has been received.
📞 Our advisor will call you within 2 hours.

To speak now, call: {{3}}

RERA Verified | Zero Brokerage | Free Site Visit
```

Only keep claims in the thank-you text that the team can honour (call within 2 hours, RERA verified, zero brokerage, free site visit).
The links use the site address from `SITE_URL` (default: the first `CLIENT_ORIGINS` entry without `www`).

Admin → Settings → WhatsApp has **Send test messages to my number**: it sends both to your own login number and shows
Meta's reason when one fails (template not approved yet, wrong name, expired token, recipient not allowed…). A message that
cannot be sent never blocks the lead; the lead records `otpSentAt`, `welcomeSentAt` and `adminNotifiedAt`. The admin can
switch the visitor welcome off, or restrict it to OTP-verified numbers (the contact page does not ask for an OTP; the property form does).
`accountUpdateTemplate` (optional, one variable) is used for agent-account / listing status messages; empty = e-mail only.

## 3. How it fits together

- **Auth**: phone + OTP → JWT in an `HttpOnly` cookie (`ncr_token`, 7 days). Roles: `user` (client), `agent`, `admin`. `Authorization: Bearer <jwt>` also works for tools.
- **Ids** are short strings (`p1abc…`, `u…`, `a…`) and JSON has `id` (never `_id`), so responses match what the website already reads.
- **Errors** are always `{ "error": { "code", "message", "details?" } }`.
- **Public visibility**: a listing is public only when `active` and `reviewStatus` is `approved`; agents only when `approved`.
- **Property slugs**: `/property/<slug>` from the title (city → locality → type… added on duplicates, then a number). Old ids / old slugs resolve with `redirect: true` and `canonicalPath`. `src/lib/propertySlug.js` is a **copy** of the website's `src/utils/propertySlug.js` — change both together.
- **Leads** come from enquiries and sign-ups; the server recomputes Hot/Warm/Cold from the raw browsing profile (`src/lib/interest.js`, a copy of the website's), stores a **Consent** record (exact sentence, legal page versions, IP, user-agent), de-duplicates, assigns an agent and notifies the team.
- **Content changes** call the rebuild webhook so the pre-rendered site stays fresh (SEO).

## 4. API reference (`/api`)

### Public
| | |
|---|---|
| `GET /health` | status + database |
| `GET /public/settings` | company, siteContent (legal pages, nudge, agent program…), cities, property types, ticker, banner, marketing ids, contact |
| `GET /public/bootstrap` | settings + all public properties, agents, posts, FAQs, reviews in one call (also for the build scripts) |
| `GET /properties` | `purpose city type beds possession maxPrice q featured agentId sort page limit` → `{ items, total, page, pages }` |
| `GET /properties/:slugOrIdOrOldSlug` | `{ property, agent, canonicalPath, redirect }` · 410 if switched off · 404 otherwise |
| `GET /agents`, `/agents/:id` | approved agents (+ their listings) |
| `GET /blog`, `/blog/:slug`, `/faqs?page=`, `/testimonials` | active content |
| `POST /leads` | enquiry `{ name, phone, email?, budget?, message?, propertyId?, city?, source, contactIntent?, phoneToken?, profile? }` |

### Auth
| | |
|---|---|
| `POST /auth/otp/send` | `{ phone, purpose: login \| register \| verify }` |
| `POST /auth/login` | `{ phone, otp }` → sets the session cookie |
| `POST /auth/register` | `{ phone, otp, name, role: user \| agent, city?, agency?, reraId?, consent: { accepted: true }, source?, profile? }` — client → lead; agent → pending agent record |
| `POST /auth/verify-phone` | `{ phone, otp }` → `{ phoneToken }` (15 min) for a verified public enquiry |
| `POST /auth/logout`, `GET /auth/me` | |

### Signed-in user (`/me`)
`GET /me` · `PATCH /me` · `GET/PUT /me/saved`, `POST/DELETE /me/saved/:propertyId` · `GET /me/inquiries` · `POST /me/events` · `GET /me/data` (export) · `POST /me/withdraw-consent` · `DELETE /me` (`{ confirm: true }` — erasure)

### Agent (`/agent`, role `agent`)
`GET/PATCH /agent/profile` · `GET /agent/stats` · `GET/POST /agent/properties` · `POST /agent/properties/import` · `GET/PATCH/DELETE /agent/properties/:id` · `PATCH /agent/properties/:id/active` (approved only) · `GET /agent/leads` · `PATCH /agent/leads/:id`

Rules enforced: listings are always saved `pending` + hidden and stamped with the agent; `featured / verified / active / reviewStatus / agentId / slug` sent by an agent are ignored; an agent only ever sees their own listings and enquiries; editing a rejected listing resubmits it.

### Admin (`/admin`, role `admin`)
| | |
|---|---|
| `properties` | list (`q reviewStatus active agentId city`), get, create, update, delete, `POST :id/approve`, `POST :id/reject {note}`, `POST bulk/action {ids, action}`, `POST import/rows {items}` |
| `agents`, `blog`, `faqs`, `testimonials` | list, get, create, update, delete, `bulk/action`, `import/rows`; `faqs` / `testimonials` also `reorder` |
| `users` | list, create, update, delete (the last active admin can never be removed or demoted); `GET users/:id/activity` — one account's full on-site history (view/search/save/compare), newest first, paginated, each event stamped with the IP + best-effort city/region/pincode it happened from (`lib/geo.js`) |
| `leads` | list (`q status intent source`), get, update (`status assignedAgentId note`), delete, `export.csv` |
| `settings`, `PUT settings/:key` | keys: `company siteContent ticker topBanner cities propertyTypes marketing whatsapp mail` (secrets are write-only) |
| `POST settings/whatsapp/test` | sends the two lead messages to the signed-in admin's own number and returns each result (with Meta's error) |
| `legal-history?kind=` | every published version of privacy / terms / disclaimer |
| `stats`, `audit`, `consents?q=phone`, `backup`, `rebuild` | dashboard numbers, action log, consent proof, JSON backup (no secrets), trigger the site rebuild |
| `security/blocks?q=`, `POST security/blocks/:id/unblock` | the IP/phone block ladder (below) — list and clear one |

### Abuse protection: the IP/phone block ladder
Repeated robotic attempts at `/auth/otp/send`, `/auth/login`, `/auth/register`, `/auth/verify-phone` (an "auth_abuse" trip
of `authLimiter`), repeated junk on the public lead form (a "form_spam" trip of `leadLimiter`), or a phone number that keeps
asking for an OTP and never once verifies it (`otp_never_verified`, checked in `services/auth.js#issueOtp`) escalate that
IP or phone up a ladder: **24 hours → 48 hours → 7 days → permanent** (`lib/security-block.js`). A blocked key is turned
away at the door (`ipBlockGuard` / `phoneBlockGuard`, before the rate limiter even runs) with `403 { error: { code:
"blocked" } }`, so an abusive IP costs the server almost nothing once flagged — the site keeps serving everyone else.
A burst of requests while a block is already active is logged but never escalates the ladder further by itself (no
jumping straight to permanent from one flood). **The admin account (`ADMIN_PHONE`) is completely exempt** — it can never
be throttled or blocked, however it is attacked. Admin → **Security** lists every block and can clear one (a shared
office Wi-Fi or a mobile number reassigned later to someone else can be caught by mistake).

This stops a single abusive IP or number; it is **not** protection against a large distributed attack (many IPs at
once) — that needs something in front of the VPS (Cloudflare's free tier is the usual choice), which this app cannot
provide by itself. It's also not possible to make the API answer "only this website" in any absolute sense: CORS is
enforced by browsers, not servers, so a script (curl, another server) that isn't a browser is never subject to it. What
actually protects the API is what's here: `originGuard` (rejects a cookie-carrying state-changing request from a
different site — the CSRF defense), the CORS allow-list (stops a *browser* on another site from reading responses),
authentication on everything but public listing data, and this block ladder for volume abuse.

### Uploads
`POST /uploads` (multipart field `files`, ≤ 10 images, 8 MB each; JPG/PNG/WebP/GIF/AVIF, bytes verified) → `{ items: [{ url }] }`. `DELETE /uploads/:file`. Files are served from `/uploads/…`.

### Live updates
`GET /events` — Server-Sent Events, open once per tab and left open. Anyone may connect (public scope); signed in
as admin or agent adds more scopes. See "Live updates" below.

## 4a. Live updates (Server-Sent Events)

The admin panel, agent panel and (in API mode) the public site update **without a refresh**: a new lead, a
listing's review status, or any admin content change pushes to already-open tabs. `GET /api/events` is a plain
Server-Sent Events stream (not Socket.io/WebSocket — nothing here needs the browser to push back over this
channel, so a one-way push is simpler and lighter; the browser's built-in `EventSource` reconnects on its own).

- `lib/events.js` — `subscribe(res, scopes)` / `broadcast(scope, event, data)`, a 20 s heartbeat. Scopes:
  `'public'` (everyone), `'admin'` (any admin), `` `agent:<agentId>` `` (that agent only).
- `contentChanged()` (`lib/misc.js`) — already called from almost every admin mutation — now also broadcasts
  `content:changed` to `'admin'` and `'public'` immediately, alongside its existing debounced site rebuild.
- Specific events with their own payload: `lead:new` (new lead → the team + the assigned agent), `listing:status`
  (approved/rejected → that listing's agent), `listing:pending` (an agent posted/imported → the team).
- **Sized for 1000+ concurrent connections** on this single-process deploy (`ecosystem.config.cjs`:
  `exec_mode: 'fork'`, `instances: 1`) — each connection is cheap (a response object + a scope string), but raise
  `ulimit -n` for the pm2-managed process and nginx's `worker_rlimit_nofile` / `worker_connections` well past
  1000 before relying on this at that scale (each connection holds one file descriptor on both nginx and Node).
- **One real limit**: connections live in the memory of **this one Node process**. A broadcast never reaches a
  different process. Don't move to pm2 cluster mode (or more than one server) without adding a shared fan-out
  layer (e.g. Redis pub/sub) first — see `docs/architecture.md` §8b.
- `/api/events` has its own nginx `location` (`deploy/nginx-api.snippet.conf.template`): no buffering, a long
  read timeout, no gzip — all needed so a push isn't delayed, and it must win over the general `/api/` block.

## 5. The website is connected

The website talks to this API when it is built with `VITE_USE_API=true` (the production build does this through
`.env.production`). Without that flag it keeps working on browser storage, so the front end can still be developed
without the backend.

- **Development**: run the API (`cd backend && npm run dev`), then in the project root `VITE_USE_API=true npm run dev` — Vite proxies `/api` and `/uploads` to `localhost:5120` (or the PORT in `backend/.env`).
- **Data**: the site is built from a *snapshot* of the public content (`src/data/snapshot.json`, written by `scripts/fetch-snapshot.mjs` from `GET /api/public/bootstrap`). Pre-rendered pages, hydration and the first paint all use it; the page then refreshes itself from the live API.
- **Login**: OTP screens call `/api/auth/*`; the session is an HttpOnly cookie. Admin / agent panels load and save through `/api/admin/*` and `/api/agent/*` (changes appear instantly, and a change the server refuses is rolled back with a message).
- **Images** chosen in any picker are uploaded to `/api/uploads` and stored as `/uploads/…` links.
- **Content published in the admin** triggers `REBUILD_COMMAND` (`npm run release`), which rebuilds the pre-rendered site into `dist-next/` and swaps it in — so Google always sees the latest listings and posts.

## 6. Deploy (VPS) — done by `.github/workflows/deploy.yml`

Every push to `main` runs the tests, then on the server: `git reset`, `npm ci --omit=dev` (backend), `pm2 startOrReload backend/ecosystem.config.cjs --env production`, waits for `/api/health`, `npm ci` + `npm run release` (website, built from the live database), `nginx -t && systemctl reload nginx`. If the API is unhealthy or `backend/.env` is missing the deploy stops **before** the website is touched.

**One-time server setup**
1. Node 20+ on the server. (`pm2` is installed by the first deploy if missing; run `pm2 startup` once so it starts after a reboot.)
2. Create `/var/www/propertyinncr.com/backend/.env` from `.env.example` (MongoDB URL, `JWT_SECRET`, `CLIENT_ORIGINS`, `OTP_DEV_MODE=false`, `REBUILD_COMMAND`). It stays on the server, never in git.
3. Atlas → *Network Access*: allow the VPS IP.
4. nginx: run once `bash /var/www/propertyinncr.com/deploy/setup-nginx.sh` — it checks that **this** API (`"service":"ncr-api"`) answers on `PORT`, generates `deploy/nginx-api.snippet.conf` from `deploy/nginx-api.snippet.conf.template` (port = `PORT` in `backend/.env`), adds the `include` line to the HTTPS server block, tests and reloads nginx. Every deploy regenerates the snippet, so a port change is picked up automatically. **`PORT` must be free on the server** (`ss -ltnp | grep :PORT`); if it is taken the API now exits with a clear message instead of pretending to run.
5. The first start creates the admin account for `ADMIN_PHONE`; the database otherwise starts **empty** — add your own listings, agents and posts in the admin panel (sample data is optional: Actions → *Run workflow* with **seed** ticked, or `npm run seed:samples` on the server). Then in **Admin → Settings** add the WhatsApp Cloud API details — without them OTP codes cannot be sent in production (`503 otp_unavailable`).

Manual re-run options (Actions → Run workflow): `seed` (also load the sample data), `rebuild_only` (skip the backend, just rebuild the site), `skip_tests`.

Backups: Atlas snapshots for the database; copy `backend/uploads/` (or move uploads to S3 / Cloudinary later — only `routes/uploads.js` changes). The admin panel also offers a JSON backup download.

## 7. Tests

`npm test` — 127 tests (auth/OTP, public API, leads, agent moderation, admin, data rights, uploads, security, the IP/phone block ladder, WhatsApp lead messages, live updates, per-user activity + IP geolocation). They start their own in-memory MongoDB and refuse to run against a remote database.
