// Writes src/data/snapshot.json — the public content (listings, agents, blog, FAQs, reviews, site settings)
// the website is built with. Everything at build time reads this one file:
//   • the sitemap / llms.txt / feed generator,
//   • the pre-renderer (crawlers get real HTML),
//   • the browser bundle — its FIRST render must equal the pre-rendered HTML (hydration), after which the
//     page refreshes itself from the live API.
//
// Source, in order:
//   1. the API   (SNAPSHOT_API_URL, default http://127.0.0.1:<PORT from backend/.env>/api — the backend running on this server)
//   2. the previous snapshot.json, if the API is unreachable (a real earlier state beats sample data)
//   3. the sample data in src/data/*.json (first run / a fresh checkout without a backend)
//
// Run with: npm run snapshot        (also runs before `npm run dev` and as the first step of `npm run build`)
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureSlugs } from '../src/utils/propertySlug.js'
import { DEFAULT_CITIES, DEFAULT_PROPERTY_TYPES } from '../src/data/taxonomy.js'
import { COMPANY_DEFAULTS } from '../src/data/company.js'
import { SITE_DEFAULTS } from '../src/data/siteDefaults.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'src/data/snapshot.json')
const quiet = process.argv.includes('--quiet')
const say = (...a) => { if (!quiet) console.log('[snapshot]', ...a) }
const read = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'))
const isActive = (x) => x.active !== false

function fromSamples() {
  return {
    source: 'samples',
    settings: { company: COMPANY_DEFAULTS, siteContent: SITE_DEFAULTS, cities: DEFAULT_CITIES, propertyTypes: DEFAULT_PROPERTY_TYPES },
    properties: ensureSlugs(read('src/data/properties.json')).filter((p) => isActive(p) && (p.reviewStatus ?? 'approved') === 'approved'),
    agents: read('src/data/agents.json').filter((a) => isActive(a) && a.status !== 'pending' && a.status !== 'rejected'),
    posts: read('src/data/blog.json').filter(isActive),
    faqs: read('src/data/faqs.json').filter(isActive),
    testimonials: read('src/data/testimonials.json').filter(isActive),
  }
}

async function fromApi(base) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(`${base.replace(/\/+$/, '')}/public/bootstrap`, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (!Array.isArray(data.properties) || !data.settings) throw new Error('unexpected response')
    return { source: 'api', ...data }
  } finally {
    clearTimeout(timer)
  }
}

let snapshot
const wantSamples = process.env.SNAPSHOT_SOURCE === 'samples'
// the API's port is whatever backend/.env says (PORT=…), 5010 if it doesn't
function apiPort() {
  try {
    const m = readFileSync(resolve(root, 'backend/.env'), 'utf8').match(/^\s*PORT\s*=\s*(\d+)/m)
    if (m) return m[1]
  } catch {
    /* no backend/.env here */
  }
  return '5010'
}
const base = process.env.SNAPSHOT_API_URL ?? `http://127.0.0.1:${apiPort()}/api`

if (!wantSamples) {
  try {
    snapshot = await fromApi(base)
    say(`from the API (${base}): ${snapshot.properties.length} listings, ${snapshot.agents.length} agents, ${snapshot.posts.length} posts`)
  } catch (err) {
    say(`API not reachable (${err.message})`)
  }
}

if (!snapshot && existsSync(out) && !wantSamples) {
  say('keeping the previous snapshot')
  process.exit(0)
}

snapshot ??= fromSamples()
if (snapshot.source === 'samples') say('using the sample data in src/data')
snapshot.generatedAt = new Date().toISOString()
writeFileSync(out, `${JSON.stringify(snapshot)}\n`)
