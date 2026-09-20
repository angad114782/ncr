// Generates public/sitemap.xml from the same data the site renders:
// static pages, blog posts, property pages, and city / BHK / type listing
// landing pages that actually have listings (empty ones are noindex, so they
// are left out). Run with: npm run sitemap  (also runs before `npm run build`).
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'))

const SITE = 'https://propertyinncr.com'
const properties = read('src/data/properties.json').filter((p) => p.active !== false)
const posts = read('src/data/blog.json')
const today = new Date().toLocaleDateString('en-CA') // local YYYY-MM-DD

const esc = (s) => s.replace(/&/g, '&amp;')
const urls = []
const add = (path, { changefreq = 'weekly', priority = '0.5', lastmod = today } = {}) =>
  urls.push({ loc: esc(`${SITE}${path}`), changefreq, priority, lastmod })

// Mirrors listingsPath() in src/utils/seo.js (fixed key order, encodeURIComponent).
const KEYS = ['purpose', 'city', 'type', 'beds', 'possession']
const listingsPath = (f) => {
  const parts = KEYS.filter((k) => f[k]).map((k) => `${k}=${encodeURIComponent(f[k])}`)
  return `/listings${parts.length ? `?${parts.join('&')}` : ''}`
}

add('/', { changefreq: 'daily', priority: '1.0' })
add('/listings', { changefreq: 'daily', priority: '0.9' })
add('/blog', { changefreq: 'weekly', priority: '0.8' })
add('/about', { changefreq: 'monthly', priority: '0.6' })
add('/team', { changefreq: 'monthly', priority: '0.6' })
add('/contact', { changefreq: 'monthly', priority: '0.6' })
add('/agents', { changefreq: 'weekly', priority: '0.6' })

posts.forEach((p) => add(`/blog/${p.slug}`, { priority: '0.7', lastmod: p.updated || p.date }))

// Listing landing pages, only for combinations that have results.
const seen = new Set()
const addListing = (filters, count, priority) => {
  if (count === 0) return
  const path = listingsPath(filters)
  if (seen.has(path)) return
  seen.add(path)
  add(path, { changefreq: 'daily', priority })
}
const cities = [...new Set(properties.map((p) => p.city))]
;['Buy', 'Rent'].forEach((purpose) => {
  addListing({ purpose }, properties.filter((p) => p.purpose === purpose).length, '0.8')
  cities.forEach((city) => {
    const inCity = properties.filter((p) => p.purpose === purpose && p.city === city)
    addListing({ purpose, city }, inCity.length, '0.8')
    ;[1, 2, 3, 4].forEach((n) =>
      addListing({ purpose, city, beds: String(n) }, inCity.filter((p) => (n === 4 ? p.beds >= 4 : p.beds === n)).length, '0.7'),
    )
    ;[...new Set(inCity.map((p) => p.type))].forEach((type) =>
      addListing({ purpose, city, type }, inCity.filter((p) => p.type === type).length, '0.7'),
    )
  })
})

properties.forEach((p) => add(`/property/${p.id}`, { priority: '0.7', lastmod: p.postedDate || today }))

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`

writeFileSync(resolve(root, 'public/sitemap.xml'), xml)
console.log(`sitemap.xml written: ${urls.length} URLs`)
