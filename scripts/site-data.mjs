// Shared by the build scripts (sitemap / llms.txt / feed / pre-render): which URLs exist and what
// is published, computed from the same seed data the app ships with. Admin edits live in each
// visitor's browser, so the crawlable (pre-rendered) site reflects the shipped content.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { landingCombos, listingsPath } from '../src/utils/listingsUrl.js'
import { ensureSlugs, propertyPath } from '../src/utils/propertySlug.js'
import { DEFAULT_CITIES, DEFAULT_PROPERTY_TYPES } from '../src/data/taxonomy.js'
import { COMPANY_DEFAULTS } from '../src/data/company.js'
import { SITE_DEFAULTS } from '../src/data/siteDefaults.js'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const SITE = 'https://propertyinncr.com'
export { listingsPath }

const read = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'))
const isActive = (x) => x.active !== false
const today = () => new Date().toLocaleDateString('en-CA') // local YYYY-MM-DD

export function loadData() {
  const properties = ensureSlugs(read('src/data/properties.json')).filter((p) => isActive(p) && (p.reviewStatus ?? 'approved') === 'approved')
  const agents = read('src/data/agents.json').filter((a) => isActive(a) && a.status !== 'pending' && a.status !== 'rejected')
  const posts = read('src/data/blog.json').filter(isActive).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  const faqs = read('src/data/faqs.json').filter(isActive)
  const cities = DEFAULT_CITIES
  const types = DEFAULT_PROPERTY_TYPES
  return { properties, agents, posts, faqs, cities, types, company: COMPANY_DEFAULTS, content: SITE_DEFAULTS }
}

/**
 * Every indexable URL. `kind` lets the callers treat pages differently; priority / changefreq
 * feed the sitemap.
 */
export function getRoutes(data = loadData()) {
  const { properties, agents, posts, cities, types } = data
  const routes = []
  const seen = new Set()
  const add = (path, extra = {}) => {
    if (seen.has(path)) return
    seen.add(path)
    routes.push({ path, kind: 'page', changefreq: 'weekly', priority: '0.5', lastmod: today(), ...extra })
  }

  add('/', { changefreq: 'daily', priority: '1.0' })
  add('/listings', { changefreq: 'daily', priority: '0.7' })
  add('/blog', { changefreq: 'weekly', priority: '0.8' })
  add('/about', { changefreq: 'monthly', priority: '0.6' })
  add('/team', { changefreq: 'monthly', priority: '0.6' })
  add('/contact', { changefreq: 'monthly', priority: '0.6' })
  add('/agents', { changefreq: 'weekly', priority: '0.6' })
  add('/sitemap', { changefreq: 'weekly', priority: '0.4' })
  add('/privacy', { changefreq: 'yearly', priority: '0.3' })
  add('/terms', { changefreq: 'yearly', priority: '0.3' })
  add('/disclaimer', { changefreq: 'yearly', priority: '0.3' })

  // Category landing pages — only combinations that actually have results.
  landingCombos(properties, cities, types).forEach((l) => add(l.path, { kind: 'listings', changefreq: 'daily', priority: l.priority }))

  posts.forEach((p) => add(`/blog/${p.slug}`, { kind: 'post', priority: '0.7', lastmod: p.updated || p.date }))
  properties.forEach((p) => add(propertyPath(p), { kind: 'property', priority: '0.7', lastmod: p.postedDate || today() }))
  agents.forEach((a) => add(`/agents/${a.id}`, { kind: 'agent', priority: '0.5' }))

  return routes
}

/**
 * Old property URLs that must keep working: /property/p6 → /property/riverside-4bhk-penthouse.
 * Written as small redirect pages by the pre-renderer (never listed in the sitemap).
 */
export function getRedirects(data = loadData()) {
  return data.properties.filter((p) => p.slug && p.slug !== String(p.id).toLowerCase()).map((p) => ({ from: `/property/${p.id}`, to: propertyPath(p) }))
}

export const xmlEscape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
