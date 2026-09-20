// COPY of the website's src/utils/interest.js — the server recomputes intent from the raw profile the
// browser sends, so it never has to trust the browser's own score. Keep in sync.
// What a visitor has shown interest in — built from their own clicks on this site and kept ON THEIR
// DEVICE (localStorage 're-interest'). It is used to
//   • personalise the "Picked for you" section and the sign-up prompt, and
//   • when the visitor creates an account (and agrees to be contacted), give the sales team a
//     head start: what they looked for, roughly what budget, and how serious they seem.
// Dependency-free so it can be unit-tested and shared with a future backend.
import { formatPriceShort } from './format.js'

const CAP = { views: 30, searches: 20, saves: 30, compares: 20 }

export const emptyProfile = () => ({
  visits: 0,
  firstSeen: '',
  lastSeen: '',
  views: [], // { id, city, type, beds, purpose, price, t }
  searches: [], // { purpose, city, type, beds, maxPrice, q, t }
  saves: [], // { id, city, type, beds, purpose, price, t }
  compares: [],
  lastEvent: '', // 'view' | 'search' | 'save' | 'compare' | 'visit'
  lastEventAt: 0,
})

const brief = (p) => ({ id: p.id, city: p.city, type: p.type, beds: p.beds, purpose: p.purpose, price: p.price })
const push = (list, item, cap) => [item, ...list].slice(0, cap)
const sameSearch = (a, b) => ['purpose', 'city', 'type', 'beds', 'maxPrice', 'q'].every((k) => (a[k] || '') === (b[k] || ''))

/** Returns a new profile with the event recorded. Pure — no storage, no clock (pass `now`). */
export function recordEvent(profile, type, data = {}, now = Date.now()) {
  const p = { ...emptyProfile(), ...profile }
  const stamp = { firstSeen: p.firstSeen || new Date(now).toISOString().slice(0, 10), lastSeen: new Date(now).toISOString().slice(0, 10) }

  switch (type) {
    case 'visit':
      return { ...p, ...stamp, visits: p.visits + 1, lastEvent: 'visit', lastEventAt: now }
    case 'view': {
      if (!data.id || p.views[0]?.id === data.id) return p
      return { ...p, ...stamp, views: push(p.views, { ...brief(data), t: now }, CAP.views), lastEvent: 'view', lastEventAt: now }
    }
    case 'search': {
      const s = {
        purpose: data.purpose || '',
        city: data.city || '',
        type: data.type || '',
        beds: data.beds || '',
        maxPrice: data.maxPrice || '',
        q: (data.q || '').trim().toLowerCase(),
      }
      if (!Object.values(s).some(Boolean) || (p.searches[0] && sameSearch(p.searches[0], s))) return p
      return { ...p, ...stamp, searches: push(p.searches, { ...s, t: now }, CAP.searches), lastEvent: 'search', lastEventAt: now }
    }
    case 'save':
      if (!data.id || p.saves.some((x) => x.id === data.id)) return p
      return { ...p, ...stamp, saves: push(p.saves, { ...brief(data), t: now }, CAP.saves), lastEvent: 'save', lastEventAt: now }
    case 'compare':
      if (!data.id || p.compares.some((x) => x.id === data.id)) return p
      return { ...p, ...stamp, compares: push(p.compares, { ...brief(data), t: now }, CAP.compares), lastEvent: 'compare', lastEventAt: now }
    default:
      return p
  }
}

function top(counts) {
  let best = ''
  let n = 0
  Object.entries(counts).forEach(([k, v]) => {
    if (v > n) { best = k; n = v }
  })
  return best
}

const median = (nums) => {
  if (!nums.length) return 0
  const s = [...nums].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

/**
 * Boils a profile down to what matters: the search focus, a rough budget, and an intent level.
 * Weights: a search or a saved home says more than a page view.
 */
export function summarise(profile) {
  const p = { ...emptyProfile(), ...profile }
  const counts = { city: {}, type: {}, beds: {}, purpose: {} }
  const bump = (key, value, w) => {
    if (value === undefined || value === null || value === '') return
    counts[key][value] = (counts[key][value] || 0) + w
  }
  p.views.forEach((v) => { bump('city', v.city, 2); bump('type', v.type, 2); bump('beds', v.beds, 2); bump('purpose', v.purpose, 2) })
  p.searches.forEach((s) => { bump('city', s.city, 3); bump('type', s.type, 3); bump('beds', s.beds, 3); bump('purpose', s.purpose, 3) })
  ;[...p.saves, ...p.compares].forEach((v) => { bump('city', v.city, 4); bump('type', v.type, 4); bump('beds', v.beds, 4); bump('purpose', v.purpose, 4) })

  const purpose = top(counts.purpose) || ''
  const city = top(counts.city)
  const type = top(counts.type)
  const beds = top(counts.beds) ? Number(top(counts.beds)) : 0

  // Budget: an explicit price cap they typed wins; otherwise a little above the homes they looked at.
  const cap = p.searches.find((s) => Number(s.maxPrice) > 0)
  const priced = [...p.saves, ...p.views].filter((v) => v.price > 0 && (!purpose || v.purpose === purpose)).map((v) => v.price)
  const budget = cap ? Number(cap.maxPrice) : priced.length ? Math.round(median(priced) * 1.15) : 0

  const uniqueViews = new Set(p.views.map((v) => v.id)).size
  const score = uniqueViews * 2 + p.searches.length * 2 + p.saves.length * 4 + p.compares.length * 3 + (p.visits > 1 ? 3 : 0) + (uniqueViews >= 3 ? 2 : 0)
  const intent = score >= 12 ? 'Hot' : score >= 5 ? 'Warm' : 'Cold'

  const bhk = beds ? `${beds >= 4 ? '4+' : beds} BHK ` : ''
  const noun = type ? `${type.toLowerCase()}s` : bhk ? 'flats' : 'properties'
  const verb = purpose === 'Rent' ? 'for rent' : purpose === 'Buy' ? 'for sale' : ''
  const focus = [`${bhk}${noun}`, verb, city ? `in ${city}` : ''].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  const hasSignal = uniqueViews + p.searches.length + p.saves.length + p.compares.length > 0

  const parts = []
  if (uniqueViews) parts.push(`viewed ${uniqueViews} home${uniqueViews > 1 ? 's' : ''}`)
  if (p.searches.length) parts.push(`${p.searches.length} search${p.searches.length > 1 ? 'es' : ''}`)
  if (p.saves.length) parts.push(`${p.saves.length} saved`)
  if (p.compares.length) parts.push(`${p.compares.length} compared`)
  if (p.visits > 1) parts.push(`${p.visits} visits`)

  const line = hasSignal
    ? `Looking for ${focus}${budget ? `, budget around ${formatPriceShort(budget)}${purpose === 'Rent' ? '/month' : ''}` : ''} · ${parts.join(', ')}`
    : ''

  return {
    hasSignal,
    score,
    intent,
    purpose,
    city,
    type,
    beds,
    budget,
    focus: hasSignal ? focus : '',
    line,
    keywords: [...new Set(p.searches.map((s) => s.q).filter(Boolean))].slice(0, 5),
    viewedIds: [...new Set(p.views.map((v) => v.id))],
    lastViewedId: p.views[0]?.id ?? null,
    visits: p.visits,
  }
}

/** How well a property fits the visitor's interest (0 = no reason to show it). */
export function matchScore(property, s) {
  if (!s.hasSignal) return 0
  let n = 0
  if (s.purpose && property.purpose === s.purpose) n += 3
  if (s.city && property.city === s.city) n += 4
  if (s.type && property.type === s.type) n += 2
  if (s.beds && (s.beds >= 4 ? property.beds >= 4 : property.beds === s.beds)) n += 2
  if (s.budget && property.price > 0 && Math.abs(property.price - s.budget) / s.budget <= 0.3) n += 2
  return n
}

/** Compact, non-identifying payload attached to a lead (and safe to send to the backend later). */
export function leadInterest(s) {
  return {
    intent: s.intent,
    score: s.score,
    purpose: s.purpose,
    city: s.city,
    type: s.type,
    beds: s.beds || '',
    budget: s.budget || 0,
    keywords: s.keywords,
    viewedIds: s.viewedIds.slice(0, 10),
    visits: s.visits,
    line: s.line,
  }
}
