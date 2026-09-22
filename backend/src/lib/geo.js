// IP → city/region/pincode, best-effort. Uses ip-api.com's free endpoint (no key, generous for a single small
// server — ~45 requests/minute) rather than a self-hosted GeoIP database, to avoid adding a binary database file
// to the deploy that needs periodic updates. Looked up ONCE per IP and cached for a day, not on every event —
// a visitor's session fires many events from the same IP.
//
// Be honest about accuracy: IP geolocation reliably gives a city/region, not a street address. A "pincode" is
// frequently missing or approximate (the ISP's registered address, not the visitor's) — never presented as exact.

const CACHE_TTL_MS = 24 * 60 * 60_000
const cache = new Map() // ip -> { at, geo }

const isPrivate = (ip) =>
  !ip || ip === '::1' || ip === '127.0.0.1' || /^::ffff:127\./.test(ip) || /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(ip.replace(/^::ffff:/, ''))

/** `{ city, region, pincode, country } | null` — null for a private/local IP or when the lookup fails. */
export async function geoForIp(ip) {
  if (isPrivate(ip)) return null
  const cached = cache.get(ip)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.geo

  let geo = null
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,zip,country`, { signal: controller.signal })
    clearTimeout(timer)
    const body = await res.json()
    if (body.status === 'success') geo = { city: body.city || '', region: body.regionName || '', pincode: body.zip || '', country: body.country || '' }
  } catch {
    geo = null // never blocks the request this is called from
  }
  cache.set(ip, { at: Date.now(), geo })
  return geo
}
