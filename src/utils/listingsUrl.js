// Clean, keyword-rich listing URLs — dependency-free so the build scripts (sitemap, pre-render,
// llms.txt) and the app share exactly one implementation.
//
//   /buy/mumbai                 flats for sale in Mumbai
//   /rent/pune/3-bhk            3 BHK for rent in Pune
//   /buy/gurugram/villa         villas for sale in Gurugram
//   /buy/3-bhk                  3 BHK for sale across India
//   /buy/mumbai/apartment?beds=3&possession=Ready%20to%20Move
//   /listings?city=Delhi        (no Buy/Rent chosen — legacy query style)
//
// Anything that is not a plain category (search text, price cap, page number) stays in the query
// string and is kept out of the index.

export const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const BASE = { Buy: '/buy', Rent: '/rent' }

export function listingsPath(filters = {}, page = 1) {
  const { purpose, city, type, beds, possession } = filters
  const query = []
  let path

  if (BASE[purpose]) {
    const parts = [BASE[purpose]]
    if (city) parts.push(slugify(city))
    if (type) {
      parts.push(slugify(type))
      if (beds) query.push(`beds=${beds}`)
    } else if (beds) {
      parts.push(`${beds}-bhk`)
    }
    path = parts.join('/')
  } else {
    path = '/listings'
    ;['city', 'type', 'beds'].forEach((k) => {
      if (filters[k]) query.push(`${k}=${encodeURIComponent(filters[k])}`)
    })
  }

  if (possession) query.push(`possession=${encodeURIComponent(possession)}`)
  if (page > 1) query.push(`page=${page}`)
  return query.length ? `${path}?${query.join('&')}` : path
}

/**
 * Turns /buy/:a/:b path segments back into filters. `a` is a city (or a BHK / type when no city),
 * `b` is a BHK or type. Returns null when a segment matches nothing (→ not-found page).
 */
export function resolveListingsSegments({ purpose, a, b }, cities = [], types = []) {
  const out = { purpose }

  const segment = (s) => {
    const bhk = s.match(/^(\d)-bhk$/)
    if (bhk) { out.beds = bhk[1]; return true }
    const type = types.find((t) => slugify(t) === s)
    if (type) { out.type = type; return true }
    return false
  }

  if (a) {
    const city = cities.find((c) => slugify(c) === a)
    if (city) out.city = city
    else if (!segment(a)) return null
  }
  if (b && !segment(b)) return null
  return out
}

const inBhk = (p, n) => (n === 4 ? p.beds >= 4 : p.beds === n)

/**
 * Every category landing page that actually has results — [{ filters, count, path, priority }].
 * One source of truth for the sitemap, the HTML site map, the footer and "popular searches", so
 * every internal link Googlebot follows lands on a page with listings (never a thin empty page).
 */
export function landingCombos(properties, cities = [], types = []) {
  const out = []
  const add = (filters, set, priority) => {
    if (set.length > 0) out.push({ filters, count: set.length, path: listingsPath(filters), priority })
  }
  ;['Buy', 'Rent'].forEach((purpose) => {
    const base = properties.filter((p) => p.purpose === purpose)
    add({ purpose }, base, '0.9')
    types.forEach((type) => add({ purpose, type }, base.filter((p) => p.type === type), '0.7'))
    ;[1, 2, 3, 4].forEach((n) => add({ purpose, beds: String(n) }, base.filter((p) => inBhk(p, n)), '0.7'))
    cities.forEach((city) => {
      const inCity = base.filter((p) => p.city === city)
      add({ purpose, city }, inCity, '0.9')
      ;[1, 2, 3, 4].forEach((n) => add({ purpose, city, beds: String(n) }, inCity.filter((p) => inBhk(p, n)), '0.7'))
      types.forEach((type) => add({ purpose, city, type }, inCity.filter((p) => p.type === type), '0.7'))
    })
  })
  return out
}
