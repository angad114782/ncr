# Keyword priority — what to do first, and why

No licensed volume/KD data was available when this was written (Semrush/Ahrefs need a login — see `backend README`
or ask the user to run the 154 keywords in `keyword-candidates.txt` through one). Instead, priority here is based on
**how much has to be built before a keyword can be honestly targeted** — the fastest wins are the ones the site can
serve *today*, with real content or real inventory, not a new page over an empty city.

| Cluster | Priority | Effort | Why |
|---|---|---|---|
| **H. Costs & legal guides** | 🟢 Now | Low | Pure content — no listings needed. Extend the existing Stamp Duty / RERA blog posts, or add new guides. Fastest real win available today. |
| **E. Builder floor (Gurgaon)** | 🟢 Now (partial) | Low | Gurgaon/Gurugram already exists as a city. Add "Builder Floor" as a property type (Admin → Settings) and list real ones — no new city needed. |
| **G. Near metro** | 🟡 Later | Medium | Needs a metro-distance field on listings to answer honestly, across all cities. |
| **D. Plots (Greater Noida)** | 🟡 Later | Medium | Needs a new "Plot" property type *and* the city. |
| **I. Property dealer by sector** | 🟡 Later | Medium | Needs the city and real agents based there — a business/ops task, not code. |
| **A. Budget × BHK, B. Rent by sector, C. Commercial, F. Resale by sector** | 🔴 Later | High | All need Noida / Ghaziabad / Faridabad / Greater Noida added as real cities **with real listings**. Publishing a landing page for a city with zero inventory is thin/misleading content — it can hurt more than it helps (Google calls this out directly, and it wastes a visitor's time). |

## What was already applied (see the code, not just this list)
- **"Gurgaon" now works everywhere "Gurugram" does** — typed/linked URLs (`/buy/gurgaon`) resolve and self-correct
  their canonical to `/buy/gurugram` (no duplicate-content risk), and the free-text search box finds Gurugram
  listings when someone types "Gurgaon" (`src/utils/listingsUrl.js`, `CITY_ALIASES`). This was the single biggest
  free win: huge real search volume was silently missed because of the spelling difference.
- **FAQ "Which cities do you cover?"** now names Gurgaon explicitly and invites the visitor to leave their
  requirement for Noida / Greater Noida / Ghaziabad / Faridabad — captures that search intent as a **lead**, honestly,
  without claiming inventory that does not exist yet.
- **New FAQ: "Do you have plots or independent builder floors?"** — same idea for clusters D and E: converts a
  high-intent visitor into a lead today, while the real fix (add the property types / cities) is still pending.
- **Fixed a stale FAQ** ("How do I list my property with you?") that still described the old contact-form flow —
  it now matches the current agent sign-up door.

## To actually rank for cluster H this week (no code needed)
Pick 2–3 of the highest-value phrases from `keyword-candidates.csv` (cluster H) and either:
1. Extend an existing blog post (Admin → Blog) with a section covering it — existing posts already have some
   ranking signal, which is usually faster than a brand-new, unindexed page — or
2. Add it as a new FAQ (Admin → FAQs) — FAQs get `FAQPage` schema site-wide, which can win a "People Also Ask" box
   without needing the page itself to rank.

## To unlock clusters A/B/C/D/F/I
That is an inventory/expansion decision (real listings, agents, a Plot/Builder-Floor type) for the business to make,
not something to fabricate. Once any of those exist, the landing-page infrastructure (city/type/BHK/budget filters,
`landingCombos`, sitemap) already generates the page automatically — no new code needed for A/B/C/F, only for
D (plot type) and G (metro-distance field).
