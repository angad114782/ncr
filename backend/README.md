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
    routes/              public · auth · me · agent · admin-* · uploads
    services/            settings, auth (OTP, sessions, consent), property (slugs), leads
    lib/                 validation schemas (zod), security helpers, notifications, slug + interest rules (copies of the website's)
    seed/seed.js         loads the website's sample data into MongoDB
  tests/                 88 tests (run on a throw-away in-memory MongoDB — never on your real database)
  uploads/               uploaded images (git-ignored)
```

## 1. Set up

```bash
cd backend
npm install
cp .env.example .env      # then fill in MONGODB_URI and JWT_SECRET (a .env is already here for local use)
npm run check-db          # tests the MongoDB connection
npm run seed              # loads sample listings / agents / blog / FAQs (adds only what's missing)
npm run dev               # http://localhost:5000  (npm start in production)
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
| `REBUILD_WEBHOOK_URL` / `_TOKEN` | called (debounced 30 s) when public content changes, so the website is rebuilt |
| `ADMIN_PHONE`, `ADMIN_NAME` | first admin account |
| `UPLOAD_DIR`, `PORT`, `TRUST_PROXY` | optional |

WhatsApp (OTP + lead alerts) and e-mail (SMTP) credentials are **not** in `.env` — the admin saves them in
the panel (`PUT /api/admin/settings/whatsapp` / `mail`); tokens are stored server-side and never returned.
Without a WhatsApp provider OTPs cannot be delivered: in production the API answers `503 otp_unavailable`.

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
| `users` | list, create, update, delete (the last active admin can never be removed or demoted) |
| `leads` | list (`q status intent source`), get, update (`status assignedAgentId note`), delete, `export.csv` |
| `settings`, `PUT settings/:key` | keys: `company siteContent ticker topBanner cities propertyTypes marketing whatsapp mail` (secrets are write-only) |
| `legal-history?kind=` | every published version of privacy / terms / disclaimer |
| `stats`, `audit`, `consents?q=phone`, `backup`, `rebuild` | dashboard numbers, action log, consent proof, JSON backup (no secrets), trigger the site rebuild |

### Uploads
`POST /uploads` (multipart field `files`, ≤ 10 images, 8 MB each; JPG/PNG/WebP/GIF/AVIF, bytes verified) → `{ items: [{ url }] }`. `DELETE /uploads/:file`. Files are served from `/uploads/…`.

## 5. Connecting the website

The website still reads `localStorage` today. To switch: (1) add an API client that calls the endpoints above with `credentials: 'include'` and a `VITE_API_URL`; (2) replace `usePersistedState` in the Data / Settings / Auth providers with those calls (the response shapes match the JSON the pages already use; `GET /public/bootstrap` gives everything for the first render); (3) replace the mock OTP in `AuthSheet` / `LeadForm` with `/auth/otp/send` + `/auth/login|register|verify-phone` (the code is now 6 digits — set `OTP_LENGTH=4` if you want to keep the 4-box input); (4) upload images with `POST /uploads` and store the returned links instead of data URLs; (5) point `scripts/site-data.mjs` at `GET /public/bootstrap` for pre-rendering. Details: `../docs/architecture.md` §8a.

## 6. Deploy (VPS)

```bash
npm ci --omit=dev
NODE_ENV=production pm2 start src/server.js --name ncr-api
```
nginx: proxy `/api/` and `/uploads/` to `http://127.0.0.1:5000`, set `TRUST_PROXY=1`, use HTTPS (cookies are `Secure` in production). Set `NODE_ENV=production`, a strong `JWT_SECRET`, `OTP_DEV_MODE=false`, real `CLIENT_ORIGINS`, and configure WhatsApp in the admin so OTPs can be sent. Back up MongoDB (Atlas does daily snapshots on paid tiers) and the `uploads/` folder (or move uploads to S3 / Cloudinary later — only `routes/uploads.js` changes).

## 7. Tests

`npm test` — 88 tests (auth/OTP, public API, leads, agent moderation, admin, data rights, uploads, security). They start their own in-memory MongoDB and refuse to run against a remote database.
